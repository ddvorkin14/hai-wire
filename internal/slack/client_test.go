package slack

import "testing"

func TestFormatMention(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"", ""},
		{"U03852Q6JG7", "<@U03852Q6JG7>"},
		{"S091P70JAP5", "<!subteam^S091P70JAP5>"},
		{"@U03852Q6JG7", "<@U03852Q6JG7>"},
		{"@S091P70JAP5", "<!subteam^S091P70JAP5>"},
		{"<!subteam^S091P70JAP5>", "<!subteam^S091P70JAP5>"},
		{"<@U03852Q6JG7>", "<@U03852Q6JG7>"},
		{"danieldvorkin", "@danieldvorkin"},
		{"@danieldvorkin", "@danieldvorkin"},
		{"@hai-conversion-on-call", "@hai-conversion-on-call"},
	}

	for _, tt := range tests {
		result := FormatMention(tt.input)
		if result != tt.expected {
			t.Errorf("FormatMention(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}
