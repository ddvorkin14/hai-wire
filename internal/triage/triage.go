package triage

import "fmt"

type Event struct {
	MessageTS  string  `json:"message_ts"`
	Author     string  `json:"author"`
	Category   string  `json:"category"`
	Confidence float64 `json:"confidence"`
	Summary    string  `json:"summary"`
	Routed     bool    `json:"routed"`
}

func ShouldRoute(category string, confidence float64, ownedCategories map[string]string, threshold float64) bool {
	_, owned := ownedCategories[category]
	return owned && confidence >= threshold
}

func FormatTriageMessage(categoryName string, confidence float64, summary, permalink, author, pingGroup string) string {
	pct := int(confidence * 100)
	var emoji string
	switch {
	case pct >= 80:
		emoji = "🟢"
	case pct >= 50:
		emoji = "🟡"
	default:
		emoji = "🔴"
	}

	return fmt.Sprintf(`%s *[Confidence: %d%%] %s*

*Summary:* %s

*Original post:* %s
*Posted by:* %s

%s`, emoji, pct, categoryName, summary, permalink, author, pingGroup)
}
