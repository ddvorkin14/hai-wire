package classifier

import (
	"strings"
	"testing"
)

func TestBuildSystemPrompt_ContainsAllCategories(t *testing.T) {
	prompt := buildSystemPrompt()
	for _, cat := range AllCategories {
		if !strings.Contains(prompt, cat.Key) {
			t.Errorf("system prompt missing category key: %s", cat.Key)
		}
		if !strings.Contains(prompt, cat.Name) {
			t.Errorf("system prompt missing category name: %s", cat.Name)
		}
	}
}

func TestParseClassification_ValidJSON(t *testing.T) {
	input := `{"category":"onboarding_blocker","confidence":0.92,"summary":"Fellow stuck on setup","reasoning":"Describes onboarding issue"}`
	result, err := parseClassification(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Category != "onboarding_blocker" {
		t.Errorf("expected onboarding_blocker, got %s", result.Category)
	}
	if result.Confidence != 0.92 {
		t.Errorf("expected 0.92, got %f", result.Confidence)
	}
	if result.Summary != "Fellow stuck on setup" {
		t.Errorf("unexpected summary: %s", result.Summary)
	}
}

func TestParseClassification_WithCodeFences(t *testing.T) {
	input := "```json\n{\"category\":\"pay_disputes\",\"confidence\":0.85,\"summary\":\"test\",\"reasoning\":\"test\"}\n```"
	result, err := parseClassification(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Category != "pay_disputes" {
		t.Errorf("expected pay_disputes, got %s", result.Category)
	}
}

func TestParseClassification_InvalidJSON(t *testing.T) {
	_, err := parseClassification("not json")
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}
