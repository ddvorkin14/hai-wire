package db

import (
	"path/filepath"
	"testing"
)

func TestNewDB_CreatesTablesOnInit(t *testing.T) {
	database, err := New(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("failed to create db: %v", err)
	}
	defer database.Close()

	var count int
	if err := database.conn.QueryRow("SELECT COUNT(*) FROM config").Scan(&count); err != nil {
		t.Fatalf("config table not created: %v", err)
	}
	if err := database.conn.QueryRow("SELECT COUNT(*) FROM owned_categories").Scan(&count); err != nil {
		t.Fatalf("owned_categories table not created: %v", err)
	}
	if err := database.conn.QueryRow("SELECT COUNT(*) FROM processed_messages").Scan(&count); err != nil {
		t.Fatalf("processed_messages table not created: %v", err)
	}
}

func TestConfigGetSet(t *testing.T) {
	database, err := New(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	if err := database.SetConfig("squad_name", "hai-conversion"); err != nil {
		t.Fatal(err)
	}
	val, err := database.GetConfig("squad_name")
	if err != nil {
		t.Fatal(err)
	}
	if val != "hai-conversion" {
		t.Fatalf("expected hai-conversion, got %s", val)
	}

	val, err = database.GetConfig("nonexistent")
	if err != nil {
		t.Fatal(err)
	}
	if val != "" {
		t.Fatalf("expected empty, got %s", val)
	}

	if err := database.SetConfig("squad_name", "hai-other"); err != nil {
		t.Fatal(err)
	}
	val, _ = database.GetConfig("squad_name")
	if val != "hai-other" {
		t.Fatalf("expected hai-other, got %s", val)
	}
}

func TestProcessedMessageDedup(t *testing.T) {
	database, err := New(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	msg := ProcessedMessage{
		MessageTS:  "1234567890.123456",
		ChannelID:  "C08MXC8URS8",
		Author:     "testuser",
		Category:   "onboarding_blocker",
		Confidence: 0.92,
		Summary:    "Fellow stuck on profile setup",
		Reasoning:  "Message describes onboarding issue",
		Routed:     true,
	}

	processed, _ := database.IsMessageProcessed(msg.MessageTS)
	if processed {
		t.Fatal("should not be processed yet")
	}

	if err := database.SaveProcessedMessage(msg); err != nil {
		t.Fatal(err)
	}

	processed, _ = database.IsMessageProcessed(msg.MessageTS)
	if !processed {
		t.Fatal("should be processed now")
	}

	err = database.SaveProcessedMessage(msg)
	if err == nil {
		t.Fatal("expected error on duplicate insert")
	}
}

func TestOwnedCategories(t *testing.T) {
	database, err := New(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	cats := map[string]string{
		"onboarding_blocker": "Onboarding Blockers",
		"platform_bug":      "Platform Bugs",
	}
	if err := database.SetOwnedCategories(cats); err != nil {
		t.Fatal(err)
	}

	got, err := database.GetOwnedCategories()
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 categories, got %d", len(got))
	}
	if got["onboarding_blocker"] != "Onboarding Blockers" {
		t.Fatalf("unexpected value: %s", got["onboarding_blocker"])
	}

	newCats := map[string]string{"pay_disputes": "Pay Disputes"}
	if err := database.SetOwnedCategories(newCats); err != nil {
		t.Fatal(err)
	}
	got, _ = database.GetOwnedCategories()
	if len(got) != 1 {
		t.Fatalf("expected 1 category after replace, got %d", len(got))
	}
}
