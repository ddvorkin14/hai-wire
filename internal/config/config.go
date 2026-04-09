package config

import (
	"hai-wire/internal/db"
	"hai-wire/internal/keychain"
)

type Service struct {
	db *db.DB
}

func NewService(database *db.DB) *Service {
	return &Service{db: database}
}

func (s *Service) SetSlackConnected(val string) error   { return s.db.SetConfig("slack_connected", val) }
func (s *Service) GetSlackConnected() (string, error)   { return s.db.GetConfig("slack_connected") }
func (s *Service) SetAnthropicKey(key string) error {
	// Remove from DB if it was previously stored there (migration from plaintext)
	s.db.SetConfig("anthropic_key", "")
	return keychain.SaveAnthropicKey(key)
}
func (s *Service) GetAnthropicKey() (string, error) {
	// Try keychain first, fall back to DB for migration
	if key, err := keychain.ReadAnthropicKey(); err == nil && key != "" {
		return key, nil
	}
	// Check legacy DB storage and migrate if found
	if key, err := s.db.GetConfig("anthropic_key"); err == nil && key != "" {
		// Migrate to keychain
		if err := keychain.SaveAnthropicKey(key); err == nil {
			s.db.SetConfig("anthropic_key", "") // Clear plaintext
		}
		return key, nil
	}
	return "", nil
}
func (s *Service) SetWatchChannelID(id string) error   { return s.db.SetConfig("watch_channel_id", id) }
func (s *Service) GetWatchChannelID() (string, error)  { return s.db.GetConfig("watch_channel_id") }
func (s *Service) SetTriageChannelID(id string) error  { return s.db.SetConfig("triage_channel_id", id) }
func (s *Service) GetTriageChannelID() (string, error) { return s.db.GetConfig("triage_channel_id") }
func (s *Service) SetSquadName(name string) error      { return s.db.SetConfig("squad_name", name) }
func (s *Service) GetSquadName() (string, error)       { return s.db.GetConfig("squad_name") }
func (s *Service) SetPingGroup(group string) error     { return s.db.SetConfig("ping_group", group) }
func (s *Service) GetPingGroup() (string, error)       { return s.db.GetConfig("ping_group") }

func (s *Service) SetRunbookText(text string) error    { return s.db.SetConfig("runbook_text", text) }
func (s *Service) GetRunbookText() (string, error)     { return s.db.GetConfig("runbook_text") }
func (s *Service) SetAckReplyEnabled(val string) error { return s.db.SetConfig("ack_reply_enabled", val) }
func (s *Service) GetAckReplyEnabled() (string, error) {
	val, err := s.db.GetConfig("ack_reply_enabled")
	if err != nil || val == "" {
		return "false", nil // Off by default
	}
	return val, nil
}

func (s *Service) SetConfidenceThreshold(threshold string) error {
	return s.db.SetConfig("confidence_threshold", threshold)
}

func (s *Service) GetConfidenceThreshold() (string, error) {
	val, err := s.db.GetConfig("confidence_threshold")
	if err != nil {
		return "0.5", err
	}
	if val == "" {
		return "0.5", nil
	}
	return val, nil
}

func (s *Service) IsSetupComplete() bool {
	required := []string{"slack_connected", "watch_channel_id", "triage_channel_id", "squad_name", "ping_group"}
	for _, key := range required {
		val, err := s.db.GetConfig(key)
		if err != nil || val == "" {
			return false
		}
	}
	// Check Anthropic key separately (stored in keychain)
	apiKey, _ := s.GetAnthropicKey()
	return apiKey != ""
}

func (s *Service) GetAllConfig() (map[string]string, error) {
	keys := []string{"slack_connected", "watch_channel_id", "triage_channel_id", "squad_name", "ping_group", "confidence_threshold", "ack_reply_enabled"}
	result := make(map[string]string)
	for _, key := range keys {
		val, err := s.db.GetConfig(key)
		if err != nil {
			return nil, err
		}
		result[key] = val
	}
	// Report whether API key exists without exposing the value
	apiKey, _ := s.GetAnthropicKey()
	if apiKey != "" {
		result["anthropic_key"] = "configured"
	}
	return result, nil
}
