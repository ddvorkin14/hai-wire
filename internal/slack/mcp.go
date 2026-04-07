package slack

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os/exec"
	"time"
	"runtime"
	"sync"

	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/client/transport"
	"github.com/mark3labs/mcp-go/mcp"
)

const (
	slackMCPURL       = "https://mcp.slack.com/mcp"
	slackClientID     = "2861056713.10883397804640"
	callbackPort      = 19876
	oauthCallbackPath = "/oauth/callback"
	redirectURI       = "https://localhost:19876/oauth/callback"
)

// ChannelInfo represents a Slack channel.
type ChannelInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// MCPClient wraps the MCP client for Slack operations.
type MCPClient struct {
	mcpClient   *client.Client
	tokenStore  *FileTokenStore
	mu          sync.Mutex
	connected   bool
	lastAuthURL string
}

// GetLastAuthURL returns the last OAuth URL for manual copy-paste.
func (m *MCPClient) GetLastAuthURL() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.lastAuthURL
}

// NewMCPClient creates a new MCP-based Slack client.
func NewMCPClient(dataDir string) *MCPClient {
	return &MCPClient{
		tokenStore: NewFileTokenStore(dataDir),
	}
}

// IsConnected returns whether we have a valid Slack connection.
func (m *MCPClient) IsConnected() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.connected
}

// Connect initiates the OAuth flow and connects to Slack's MCP server.
// Opens the browser for the user to authorize.
func (m *MCPClient) Connect(ctx context.Context) (string, error) {
	// If we don't have a stored token, we need to do OAuth first.
	// The MCP SDK's OAuth flow is triggered by attempting a connection.
	// We need to make a request that triggers the 401 → OAuth discovery flow.

	oauthConfig := client.OAuthConfig{
		ClientID:    slackClientID,
		RedirectURI: redirectURI,
		TokenStore:  m.tokenStore,
		PKCEEnabled: true,
	}

	// Attempt to connect -- this will either succeed (if token exists) or
	// return an OAuth error that we handle
	err := m.tryConnect(ctx, oauthConfig)

	if err != nil {
		// Any error on first attempt -- try OAuth flow
		log.Printf("Initial connect failed (%v), attempting OAuth flow...", err)

		// Force an OAuth discovery by creating a fresh client
		flowErr := m.forceOAuthFlow(ctx, oauthConfig)
		if flowErr != nil {
			return "", fmt.Errorf("oauth flow: %w", flowErr)
		}

		// Retry after OAuth
		err = m.tryConnect(ctx, oauthConfig)
		if err != nil {
			return "", fmt.Errorf("connect after auth: %w", err)
		}
	}

	teamName := m.getTeamName(ctx)
	return teamName, nil
}

func (m *MCPClient) tryConnect(ctx context.Context, oauthConfig client.OAuthConfig) error {
	mcpClient, err := client.NewOAuthStreamableHttpClient(slackMCPURL, oauthConfig)
	if err != nil {
		return err
	}

	if err := mcpClient.Start(ctx); err != nil {
		return err
	}

	initReq := mcp.InitializeRequest{
		Params: struct {
			ProtocolVersion string                 `json:"protocolVersion"`
			Capabilities    mcp.ClientCapabilities `json:"capabilities"`
			ClientInfo      mcp.Implementation     `json:"clientInfo"`
		}{
			ProtocolVersion: mcp.LATEST_PROTOCOL_VERSION,
			ClientInfo: mcp.Implementation{
				Name:    "hai-wire",
				Version: "1.0.0",
			},
		},
	}

	_, err = mcpClient.Initialize(ctx, initReq)
	if err != nil {
		mcpClient.Close()
		return err
	}

	m.mu.Lock()
	m.mcpClient = mcpClient
	m.connected = true
	m.mu.Unlock()
	return nil
}

// forceOAuthFlow manually triggers the OAuth discovery and authorization flow
// by making an HTTP request to the MCP server to get the 401 + OAuth metadata.
func (m *MCPClient) forceOAuthFlow(ctx context.Context, oauthConfig client.OAuthConfig) error {
	mcpClient, err := client.NewOAuthStreamableHttpClient(slackMCPURL, oauthConfig)
	if err != nil {
		return err
	}

	// Start will trigger OAuth discovery on the transport level
	err = mcpClient.Start(ctx)
	if client.IsOAuthAuthorizationRequiredError(err) {
		return m.runOAuthFlow(ctx, err)
	}

	// If Start succeeded, try Initialize -- it might trigger OAuth
	initReq := mcp.InitializeRequest{
		Params: struct {
			ProtocolVersion string                 `json:"protocolVersion"`
			Capabilities    mcp.ClientCapabilities `json:"capabilities"`
			ClientInfo      mcp.Implementation     `json:"clientInfo"`
		}{
			ProtocolVersion: mcp.LATEST_PROTOCOL_VERSION,
			ClientInfo: mcp.Implementation{
				Name:    "hai-wire",
				Version: "1.0.0",
			},
		},
	}
	_, err = mcpClient.Initialize(ctx, initReq)
	if client.IsOAuthAuthorizationRequiredError(err) {
		return m.runOAuthFlow(ctx, err)
	}

	// If we got here without an OAuth error, maybe the token is actually valid
	if err == nil {
		m.mu.Lock()
		m.mcpClient = mcpClient
		m.connected = true
		m.mu.Unlock()
		return nil
	}

	// Some other error -- the MCP SDK might not be surfacing the OAuth error
	// correctly for Slack's server. Let's try the manual HTTP approach.
	log.Printf("MCP SDK didn't trigger OAuth flow (error: %v), trying manual discovery...", err)
	return m.manualOAuthDiscovery(ctx)
}

// Reconnect tries to reconnect using stored tokens (no browser).
func (m *MCPClient) Reconnect(ctx context.Context) error {
	oauthConfig := client.OAuthConfig{
		ClientID:    slackClientID,
		RedirectURI: redirectURI,
		TokenStore:  m.tokenStore,
		PKCEEnabled: true,
	}

	mcpClient, err := client.NewOAuthStreamableHttpClient(slackMCPURL, oauthConfig)
	if err != nil {
		return err
	}

	if err := mcpClient.Start(ctx); err != nil {
		return err
	}

	_, err = mcpClient.Initialize(ctx, mcp.InitializeRequest{
		Params: struct {
			ProtocolVersion string                 `json:"protocolVersion"`
			Capabilities    mcp.ClientCapabilities `json:"capabilities"`
			ClientInfo      mcp.Implementation     `json:"clientInfo"`
		}{
			ProtocolVersion: mcp.LATEST_PROTOCOL_VERSION,
			ClientInfo: mcp.Implementation{
				Name:    "hai-wire",
				Version: "1.0.0",
			},
		},
	})
	if err != nil {
		return err
	}

	m.mu.Lock()
	m.mcpClient = mcpClient
	m.connected = true
	m.mu.Unlock()
	return nil
}

// manualOAuthDiscovery does the OAuth flow by hitting the MCP endpoint directly
// and parsing the 401 response to get OAuth metadata.
func (m *MCPClient) manualOAuthDiscovery(ctx context.Context) error {
	// Step 1: Hit the MCP endpoint to get the 401 + resource metadata URL
	req, _ := http.NewRequestWithContext(ctx, "POST", slackMCPURL, nil)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("discovery request: %w", err)
	}
	resp.Body.Close()

	// Step 2: Get the resource metadata to find the authorization server
	resourceURL := resp.Header.Get("WWW-Authenticate")
	log.Printf("WWW-Authenticate header: %s", resourceURL)
	log.Printf("Response status: %d", resp.StatusCode)

	// Step 3: Get OAuth authorization server metadata
	metaResp, err := http.Get(slackMCPURL[:len("https://mcp.slack.com")] + "/.well-known/oauth-authorization-server")
	if err != nil {
		return fmt.Errorf("get oauth metadata: %w", err)
	}
	defer metaResp.Body.Close()

	var metadata struct {
		AuthorizationEndpoint            string `json:"authorization_endpoint"`
		TokenEndpoint                    string `json:"token_endpoint"`
		RegistrationEndpoint             string `json:"registration_endpoint"`
		CodeChallengeMethodsSupported    []string `json:"code_challenge_methods_supported"`
	}
	if err := json.NewDecoder(metaResp.Body).Decode(&metadata); err != nil {
		return fmt.Errorf("parse oauth metadata: %w", err)
	}

	log.Printf("OAuth metadata: auth=%s token=%s reg=%s", metadata.AuthorizationEndpoint, metadata.TokenEndpoint, metadata.RegistrationEndpoint)

	// Step 4: Build authorization URL with PKCE (using existing app client ID)
	codeVerifier, _ := client.GenerateCodeVerifier()
	codeChallenge := client.GenerateCodeChallenge(codeVerifier)
	state, _ := client.GenerateState()

	scopes := "channels:history,channels:read,chat:write,users:read"
	params := url.Values{
		"client_id":             {slackClientID},
		"redirect_uri":          {redirectURI},
		"response_type":         {"code"},
		"scope":                 {scopes},
		"user_scope":            {scopes},
		"code_challenge":        {codeChallenge},
		"code_challenge_method": {"S256"},
		"state":                 {state},
	}
	authURL := metadata.AuthorizationEndpoint + "?" + params.Encode()

	// Step 6: Start callback server and open browser
	callbackChan := make(chan map[string]string, 1)
	errChan := make(chan error, 1)

	mux := http.NewServeMux()
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", callbackPort),
		Handler: mux,
	}

	mux.HandleFunc(oauthCallbackPath, func(w http.ResponseWriter, r *http.Request) {
		params := make(map[string]string)
		for key, values := range r.URL.Query() {
			if len(values) > 0 {
				params[key] = values[0]
			}
		}
		callbackChan <- params
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0f172a;color:#f8fafc;">
			<div style="text-align:center"><h2 style="color:#fbbf24">Connected to Slack!</h2><p>You can close this tab and return to HAI-Wire.</p></div>
		</body></html>`))
	})

	cert, err := generateSelfSignedCert()
	if err != nil {
		return fmt.Errorf("generate TLS cert: %w", err)
	}
	server.TLSConfig = &tls.Config{Certificates: []tls.Certificate{cert}}

	listener, err := tls.Listen("tcp", fmt.Sprintf(":%d", callbackPort), server.TLSConfig)
	if err != nil {
		// Port might be in use from a previous attempt -- try to kill it
		log.Printf("Port %d in use, retrying...", callbackPort)
		// Wait briefly and retry once
		time.Sleep(500 * time.Millisecond)
		listener, err = tls.Listen("tcp", fmt.Sprintf(":%d", callbackPort), server.TLSConfig)
		if err != nil {
			return fmt.Errorf("start TLS listener (port %d in use -- close other instances): %w", callbackPort, err)
		}
	}

	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()
	defer server.Shutdown(ctx)

	m.mu.Lock()
	m.lastAuthURL = authURL
	m.mu.Unlock()

	log.Printf("Opening browser for OAuth: %s", authURL)
	openBrowser(authURL)

	// Step 7: Wait for callback
	select {
	case params := <-callbackChan:
		if params["state"] != state {
			return fmt.Errorf("state mismatch")
		}
		code := params["code"]
		if code == "" {
			return fmt.Errorf("no auth code received")
		}

		// Step 8: Exchange code for token
		tokenData := url.Values{
			"grant_type":    {"authorization_code"},
			"code":          {code},
			"redirect_uri":  {redirectURI},
			"client_id":     {slackClientID},
			"code_verifier": {codeVerifier},
		}
		tokenResp, err := http.PostForm(metadata.TokenEndpoint, tokenData)
		if err != nil {
			return fmt.Errorf("token exchange: %w", err)
		}
		defer tokenResp.Body.Close()

		var tokenResult struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			ExpiresIn    int    `json:"expires_in"`
			TokenType    string `json:"token_type"`
		}
		if err := json.NewDecoder(tokenResp.Body).Decode(&tokenResult); err != nil {
			return fmt.Errorf("parse token: %w", err)
		}

		log.Printf("Got access token: %s...", tokenResult.AccessToken[:min(15, len(tokenResult.AccessToken))])

		// Save token to store
		token := &transport.Token{
			AccessToken:  tokenResult.AccessToken,
			RefreshToken: tokenResult.RefreshToken,
			ExpiresIn:    int64(tokenResult.ExpiresIn),
			TokenType:    tokenResult.TokenType,
		}
		return m.tokenStore.SaveToken(ctx, token)

	case err := <-errChan:
		return err
	case <-ctx.Done():
		return fmt.Errorf("authorization timed out")
	}
}

func (m *MCPClient) runOAuthFlow(ctx context.Context, authErr error) error {
	oauthHandler := client.GetOAuthHandler(authErr)

	callbackChan := make(chan map[string]string, 1)
	errChan := make(chan error, 1)

	mux := http.NewServeMux()
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", callbackPort),
		Handler: mux,
	}

	mux.HandleFunc(oauthCallbackPath, func(w http.ResponseWriter, r *http.Request) {
		params := make(map[string]string)
		for key, values := range r.URL.Query() {
			if len(values) > 0 {
				params[key] = values[0]
			}
		}
		callbackChan <- params
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0f172a;color:#f8fafc;">
			<div style="text-align:center"><h2 style="color:#fbbf24">Connected to Slack!</h2><p>You can close this tab and return to HAI-Wire.</p></div>
		</body></html>`))
	})

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()
	defer server.Shutdown(ctx)

	codeVerifier, err := client.GenerateCodeVerifier()
	if err != nil {
		return fmt.Errorf("generate code verifier: %w", err)
	}
	codeChallenge := client.GenerateCodeChallenge(codeVerifier)

	state, err := client.GenerateState()
	if err != nil {
		return fmt.Errorf("generate state: %w", err)
	}

	if oauthHandler.GetClientID() == "" {
		if err := oauthHandler.RegisterClient(ctx, "hai-wire"); err != nil {
			return fmt.Errorf("register client: %w", err)
		}
	}

	authURL, err := oauthHandler.GetAuthorizationURL(ctx, state, codeChallenge)
	if err != nil {
		return fmt.Errorf("get auth URL: %w", err)
	}

	openBrowser(authURL)

	select {
	case params := <-callbackChan:
		if params["state"] != state {
			return fmt.Errorf("state mismatch")
		}
		code := params["code"]
		if code == "" {
			return fmt.Errorf("no authorization code received")
		}
		return oauthHandler.ProcessAuthorizationResponse(ctx, code, state, codeVerifier)
	case err := <-errChan:
		return err
	case <-ctx.Done():
		return fmt.Errorf("authorization timed out")
	}
}

// CallTool calls a Slack MCP tool and returns the text result.
func (m *MCPClient) CallTool(ctx context.Context, toolName string, args map[string]interface{}) (string, error) {
	m.mu.Lock()
	c := m.mcpClient
	m.mu.Unlock()

	if c == nil {
		return "", fmt.Errorf("not connected to Slack")
	}

	result, err := c.CallTool(ctx, mcp.CallToolRequest{
		Params: mcp.CallToolParams{
			Name:      toolName,
			Arguments: args,
		},
	})
	if err != nil {
		return "", err
	}

	for _, content := range result.Content {
		if textContent, ok := content.(mcp.TextContent); ok {
			return textContent.Text, nil
		}
	}
	return "", fmt.Errorf("no text content in response")
}

// --- High-level Slack operations ---

func (m *MCPClient) ListChannels(ctx context.Context) ([]ChannelInfo, error) {
	result, err := m.CallTool(ctx, "slack_search_channels", map[string]interface{}{
		"query": "",
		"limit": 100,
	})
	if err != nil {
		return nil, err
	}

	// Parse channel info from the MCP response
	// The response is markdown-formatted, so we'll use a simpler approach
	return parseChannelsFromSearch(result), nil
}

func (m *MCPClient) ReadChannel(ctx context.Context, channelID string, limit int, oldest string) (string, error) {
	args := map[string]interface{}{
		"channel_id": channelID,
		"limit":      limit,
	}
	if oldest != "" {
		args["oldest"] = oldest
	}
	return m.CallTool(ctx, "slack_read_channel", args)
}

func (m *MCPClient) SendMessage(ctx context.Context, channelID, text string) error {
	_, err := m.CallTool(ctx, "slack_send_message", map[string]interface{}{
		"channel_id": channelID,
		"text":       text,
	})
	return err
}

func (m *MCPClient) ReadThread(ctx context.Context, channelID, threadTS string) (string, error) {
	return m.CallTool(ctx, "slack_read_thread", map[string]interface{}{
		"channel_id": channelID,
		"message_ts": threadTS,
	})
}

func (m *MCPClient) getTeamName(ctx context.Context) string {
	result, err := m.CallTool(ctx, "slack_read_user_profile", map[string]interface{}{})
	if err != nil {
		log.Printf("get team name error: %v", err)
		return "Slack Workspace"
	}
	_ = result
	return "Slack Workspace"
}

// Close disconnects the MCP client.
func (m *MCPClient) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.mcpClient != nil {
		m.mcpClient.Close()
		m.connected = false
	}
}

// parseChannelsFromSearch parses channel names/IDs from MCP search results.
func parseChannelsFromSearch(result string) []ChannelInfo {
	// MCP returns markdown-formatted results, try to extract channel info
	// This is a simple parser -- the real data comes in structured format
	var channels []ChannelInfo
	// For now, return empty -- we'll get channels from the Slack API directly
	_ = result
	return channels
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
