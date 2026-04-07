package triage

import (
	"strings"
	"testing"
)

func TestShouldRoute_MatchingCategory(t *testing.T) {
	owned := map[string]string{"onboarding_blocker": "Onboarding Blockers"}
	result := shouldRoute("onboarding_blocker", 0.85, owned, 0.5)
	if !result {
		t.Fatal("should route matching category above threshold")
	}
}

func TestShouldRoute_NonMatchingCategory(t *testing.T) {
	owned := map[string]string{"onboarding_blocker": "Onboarding Blockers"}
	result := shouldRoute("pay_disputes", 0.95, owned, 0.5)
	if result {
		t.Fatal("should not route non-matching category")
	}
}

func TestShouldRoute_BelowThreshold(t *testing.T) {
	owned := map[string]string{"onboarding_blocker": "Onboarding Blockers"}
	result := shouldRoute("onboarding_blocker", 0.3, owned, 0.5)
	if result {
		t.Fatal("should not route below threshold")
	}
}

func TestFormatTriageMessage(t *testing.T) {
	msg := formatTriageMessage("Onboarding Blockers", 0.92, "Fellow stuck on setup", "https://slack.com/msg", "Jane Doe", "@hai-conversion-on-call")
	if !strings.Contains(msg, "92%") {
		t.Error("should contain confidence percentage")
	}
	if !strings.Contains(msg, "Onboarding Blockers") {
		t.Error("should contain category name")
	}
	if !strings.Contains(msg, "@hai-conversion-on-call") {
		t.Error("should contain ping group")
	}
	if !strings.Contains(msg, "Jane Doe") {
		t.Error("should contain author name")
	}
}

func TestFormatTriageMessage_ConfidenceBadges(t *testing.T) {
	high := formatTriageMessage("Test", 0.85, "s", "l", "a", "g")
	if !strings.Contains(high, "🟢") {
		t.Error("high confidence should have green badge")
	}

	medium := formatTriageMessage("Test", 0.65, "s", "l", "a", "g")
	if !strings.Contains(medium, "🟡") {
		t.Error("medium confidence should have yellow badge")
	}

	low := formatTriageMessage("Test", 0.3, "s", "l", "a", "g")
	if !strings.Contains(low, "🔴") {
		t.Error("low confidence should have red badge")
	}
}
