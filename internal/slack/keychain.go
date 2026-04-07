package slack

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"os/user"
	"time"
)

type keychainCredentials struct {
	McpOAuth map[string]struct {
		ServerName  string `json:"serverName"`
		AccessToken string `json:"accessToken"`
		ExpiresAt   int64  `json:"expiresAt"`
		Scope       string `json:"scope"`
	} `json:"mcpOAuth"`
}

// ReadSlackTokenFromKeychain reads the Slack OAuth token stored by Claude Code.
func ReadSlackTokenFromKeychain() (string, error) {
	currentUser, err := user.Current()
	if err != nil {
		return "", fmt.Errorf("get current user: %w", err)
	}

	out, err := exec.Command("security", "find-generic-password",
		"-s", "Claude Code-credentials",
		"-a", currentUser.Username,
		"-w",
	).Output()
	if err != nil {
		return "", fmt.Errorf("read keychain: %w (is Claude Code's Slack MCP connected?)", err)
	}

	var creds keychainCredentials
	if err := json.Unmarshal(out, &creds); err != nil {
		return "", fmt.Errorf("parse keychain data: %w", err)
	}

	for key, val := range creds.McpOAuth {
		if val.ServerName == "slack" || (len(key) > 5 && key[:6] == "slack|") {
			if val.AccessToken == "" {
				return "", fmt.Errorf("slack token found but empty")
			}
			// Check expiry
			if val.ExpiresAt > 0 && val.ExpiresAt < time.Now().UnixMilli() {
				return "", fmt.Errorf("slack token expired -- reconnect Slack in Claude Code (/mcp)")
			}
			return val.AccessToken, nil
		}
	}

	return "", fmt.Errorf("no Slack token found -- connect Slack MCP in Claude Code first (/mcp)")
}
