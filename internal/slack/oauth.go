package slack

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

const (
	// Slack OAuth endpoints
	authURL  = "https://slack.com/oauth/v2/authorize"
	tokenURL = "https://slack.com/api/oauth.v2.access"

	// Required scopes for HAI-Wire
	scopes = "channels:history,channels:read,chat:write,users:read,users.profile:read"

	// Local callback config
	callbackPort = 19876
	callbackPath = "/callback"
)

type OAuthResult struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TeamName     string `json:"team_name"`
	ExpiresIn    int    `json:"expires_in"`
}

type tokenResponse struct {
	OK          bool   `json:"ok"`
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Team        struct {
		Name string `json:"name"`
	} `json:"team"`
	AuthedUser struct {
		AccessToken string `json:"access_token"`
	} `json:"authed_user"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Error        string `json:"error"`
}

// StartOAuthFlow opens the browser for Slack OAuth and waits for the callback.
// clientID should be your Slack app's client ID.
// clientSecret should be your Slack app's client secret.
func StartOAuthFlow(clientID, clientSecret string) (*OAuthResult, error) {
	// Generate PKCE verifier and challenge
	verifier, challenge, err := generatePKCE()
	if err != nil {
		return nil, fmt.Errorf("generate PKCE: %w", err)
	}

	// Generate state for CSRF protection
	state, err := generateRandomString(32)
	if err != nil {
		return nil, fmt.Errorf("generate state: %w", err)
	}

	// Start local callback server
	resultCh := make(chan *OAuthResult, 1)
	errCh := make(chan error, 1)

	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", callbackPort))
	if err != nil {
		return nil, fmt.Errorf("start callback server: %w", err)
	}

	mux := http.NewServeMux()
	server := &http.Server{Handler: mux}

	mux.HandleFunc(callbackPath, func(w http.ResponseWriter, r *http.Request) {
		// Verify state
		if r.URL.Query().Get("state") != state {
			errCh <- fmt.Errorf("state mismatch")
			fmt.Fprintf(w, "<html><body><h2>Error: state mismatch</h2></body></html>")
			return
		}

		code := r.URL.Query().Get("code")
		if code == "" {
			errMsg := r.URL.Query().Get("error")
			errCh <- fmt.Errorf("oauth error: %s", errMsg)
			fmt.Fprintf(w, "<html><body><h2>Error: %s</h2></body></html>", errMsg)
			return
		}

		// Exchange code for token
		result, err := exchangeCode(code, clientID, clientSecret, verifier)
		if err != nil {
			errCh <- err
			fmt.Fprintf(w, "<html><body><h2>Error exchanging token</h2><p>%s</p></body></html>", err.Error())
			return
		}

		resultCh <- result
		fmt.Fprintf(w, `<html><body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc;">
			<div style="text-align: center;">
				<h2 style="color: #fbbf24;">Connected to %s!</h2>
				<p>You can close this tab and return to HAI-Wire.</p>
			</div>
		</body></html>`, result.TeamName)
	})

	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	// Build auth URL
	params := url.Values{
		"client_id":             {clientID},
		"scope":                 {scopes},
		"user_scope":            {scopes},
		"redirect_uri":          {fmt.Sprintf("http://localhost:%d%s", callbackPort, callbackPath)},
		"state":                 {state},
		"code_challenge":        {challenge},
		"code_challenge_method": {"S256"},
	}
	authFullURL := authURL + "?" + params.Encode()

	// Open browser
	openBrowser(authFullURL)

	// Wait for result or timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	defer server.Shutdown(context.Background())

	select {
	case result := <-resultCh:
		return result, nil
	case err := <-errCh:
		return nil, err
	case <-ctx.Done():
		return nil, fmt.Errorf("oauth timed out — did you complete the Slack authorization?")
	}
}

func exchangeCode(code, clientID, clientSecret, verifier string) (*OAuthResult, error) {
	data := url.Values{
		"code":          {code},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"redirect_uri":  {fmt.Sprintf("http://localhost:%d%s", callbackPort, callbackPath)},
		"code_verifier": {verifier},
	}

	resp, err := http.Post(tokenURL, "application/x-www-form-urlencoded", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("token exchange request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read token response: %w", err)
	}

	var tokenResp tokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("parse token response: %w", err)
	}

	if !tokenResp.OK {
		return nil, fmt.Errorf("slack oauth error: %s", tokenResp.Error)
	}

	// Prefer user token
	accessToken := tokenResp.AuthedUser.AccessToken
	if accessToken == "" {
		accessToken = tokenResp.AccessToken
	}

	return &OAuthResult{
		AccessToken:  accessToken,
		RefreshToken: tokenResp.RefreshToken,
		TeamName:     tokenResp.Team.Name,
		ExpiresIn:    tokenResp.ExpiresIn,
	}, nil
}

func generatePKCE() (verifier string, challenge string, err error) {
	verifier, err = generateRandomString(64)
	if err != nil {
		return
	}
	h := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(h[:])
	return
}

func generateRandomString(length int) (string, error) {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b)[:length], nil
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	}
	if cmd != nil {
		cmd.Start()
	}
}
