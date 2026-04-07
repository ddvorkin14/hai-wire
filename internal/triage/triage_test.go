package triage

import (
	"strings"
	"testing"
)

func TestShouldRoute_MatchingCategory(t *testing.T) {
	owned := map[string]string{"onboarding_blocker": "Onboarding Blockers"}
	if !ShouldRoute("onboarding_blocker", 0.85, owned, 0.5) {
		t.Fatal("should route matching category above threshold")
	}
}

func TestShouldRoute_NonMatchingCategory(t *testing.T) {
	owned := map[string]string{"onboarding_blocker": "Onboarding Blockers"}
	if ShouldRoute("pay_disputes", 0.95, owned, 0.5) {
		t.Fatal("should not route non-matching category")
	}
}

func TestShouldRoute_BelowThreshold(t *testing.T) {
	owned := map[string]string{"onboarding_blocker": "Onboarding Blockers"}
	if ShouldRoute("onboarding_blocker", 0.3, owned, 0.5) {
		t.Fatal("should not route below threshold")
	}
}

func TestFormatTriageMessage(t *testing.T) {
	msg := FormatTriageMessage("Onboarding Blockers", 0.92, "Fellow stuck on setup", "https://slack.com/msg", "Jane Doe", "@hai-conversion-on-call")
	if !strings.Contains(msg, "92%") {
		t.Error("should contain confidence percentage")
	}
	if !strings.Contains(msg, "Onboarding Blockers") {
		t.Error("should contain category name")
	}
	if !strings.Contains(msg, "@hai-conversion-on-call") {
		t.Error("should contain ping group")
	}
}

func TestFormatTriageMessage_ConfidenceBadges(t *testing.T) {
	high := FormatTriageMessage("Test", 0.85, "s", "l", "a", "g")
	if !strings.Contains(high, "🟢") {
		t.Error("high confidence should have green badge")
	}
	medium := FormatTriageMessage("Test", 0.65, "s", "l", "a", "g")
	if !strings.Contains(medium, "🟡") {
		t.Error("medium confidence should have yellow badge")
	}
	low := FormatTriageMessage("Test", 0.3, "s", "l", "a", "g")
	if !strings.Contains(low, "🔴") {
		t.Error("low confidence should have red badge")
	}
}
