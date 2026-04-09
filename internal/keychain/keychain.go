package keychain

import (
	"fmt"
	"os/exec"
	"os/user"
	"strings"
)

const serviceName = "HAI-Wire-anthropic"

// SaveAnthropicKey stores the Anthropic API key in the macOS Keychain.
func SaveAnthropicKey(key string) error {
	currentUser, err := user.Current()
	if err != nil {
		return fmt.Errorf("get current user: %w", err)
	}

	// -U flag updates the entry if it already exists
	cmd := exec.Command("security", "add-generic-password",
		"-s", serviceName,
		"-a", currentUser.Username,
		"-w", key,
		"-U",
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("save to keychain: %w (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

// ReadAnthropicKey reads the Anthropic API key from the macOS Keychain.
func ReadAnthropicKey() (string, error) {
	currentUser, err := user.Current()
	if err != nil {
		return "", fmt.Errorf("get current user: %w", err)
	}

	out, err := exec.Command("security", "find-generic-password",
		"-s", serviceName,
		"-a", currentUser.Username,
		"-w",
	).Output()
	if err != nil {
		return "", fmt.Errorf("read keychain: %w (API key not stored yet)", err)
	}

	key := strings.TrimSpace(string(out))
	if key == "" {
		return "", fmt.Errorf("anthropic key found but empty")
	}
	return key, nil
}

// DeleteAnthropicKey removes the Anthropic API key from the macOS Keychain.
func DeleteAnthropicKey() error {
	currentUser, err := user.Current()
	if err != nil {
		return fmt.Errorf("get current user: %w", err)
	}

	cmd := exec.Command("security", "delete-generic-password",
		"-s", serviceName,
		"-a", currentUser.Username,
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("delete from keychain: %w (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}
