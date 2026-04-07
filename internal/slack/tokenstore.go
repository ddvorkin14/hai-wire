package slack

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"

	"github.com/mark3labs/mcp-go/client/transport"
)

// FileTokenStore persists OAuth tokens to a local file.
type FileTokenStore struct {
	path  string
	mu    sync.Mutex
	token *transport.Token
}

func NewFileTokenStore(dataDir string) *FileTokenStore {
	return &FileTokenStore{
		path: filepath.Join(dataDir, "slack-token.json"),
	}
}

func (f *FileTokenStore) GetToken(ctx context.Context) (*transport.Token, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	// Return cached token if we have one
	if f.token != nil {
		return f.token, nil
	}

	// Try to load from file
	data, err := os.ReadFile(f.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, errors.New("no token available")
		}
		return nil, err
	}

	var token transport.Token
	if err := json.Unmarshal(data, &token); err != nil {
		return nil, err
	}

	f.token = &token
	return f.token, nil
}

func (f *FileTokenStore) SaveToken(ctx context.Context, token *transport.Token) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.token = token

	data, err := json.MarshalIndent(token, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(f.path, data, 0600)
}

// HasToken returns true if a saved token exists.
func (f *FileTokenStore) HasToken() bool {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.token != nil {
		return true
	}

	_, err := os.Stat(f.path)
	return err == nil
}
