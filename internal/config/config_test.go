package config

import (
	"path/filepath"
	"testing"

	"hai-wire/internal/db"
)

func setupTestDB(t *testing.T) *db.DB {
	database, err := db.New(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	return database
}

func TestService_SetAndGetSquadName(t *testing.T) {
	database := setupTestDB(t)
	defer database.Close()
	svc := NewService(database)

	if err := svc.SetSquadName("hai-conversion"); err != nil {
		t.Fatal(err)
	}
	name, err := svc.GetSquadName()
	if err != nil {
		t.Fatal(err)
	}
	if name != "hai-conversion" {
		t.Fatalf("expected hai-conversion, got %s", name)
	}
}

func TestService_IsSetupComplete_False(t *testing.T) {
	database := setupTestDB(t)
	defer database.Close()
	svc := NewService(database)

	if svc.IsSetupComplete() {
		t.Fatal("setup should not be complete with no config")
	}
}

func TestService_IsSetupComplete_True(t *testing.T) {
	database := setupTestDB(t)
	defer database.Close()
	svc := NewService(database)

	svc.SetSlackBotToken("xoxb-test")
	svc.SetSlackAppToken("xapp-test")
	svc.SetAnthropicKey("sk-ant-test")
	svc.SetWatchChannelID("C12345")
	svc.SetTriageChannelID("C67890")
	svc.SetSquadName("test-squad")
	svc.SetPingGroup("@test-oncall")

	if !svc.IsSetupComplete() {
		t.Fatal("setup should be complete")
	}
}
