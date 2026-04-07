package classifier

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

type ExtractedCategory struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// ExtractCategoriesFromDocument sends a document to Claude and asks it to extract
// support categories that can be used for classification.
func ExtractCategoriesFromDocument(ctx context.Context, apiKey, documentText string) ([]ExtractedCategory, error) {
	client := anthropic.NewClient(option.WithAPIKey(apiKey))

	prompt := `You are analyzing a support runbook/document to extract issue categories for a triage system.

Read the document below and extract distinct support issue categories. For each category, provide:
- key: a short snake_case identifier (e.g., "onboarding_blocker", "pay_dispute")
- name: a human-readable name (e.g., "Onboarding Blockers", "Pay Disputes")
- description: a 1-2 sentence description of what issues fall into this category

Focus on categories that represent different types of support requests that different teams might handle.

Respond with ONLY valid JSON -- an array of category objects:
[
  {"key": "example_category", "name": "Example Category", "description": "Issues related to..."},
  ...
]

Do not include any text outside the JSON array.`

	msg, err := client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeSonnet4_5,
		MaxTokens: 4096,
		System: []anthropic.TextBlockParam{
			{Text: prompt},
		},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(
				anthropic.NewTextBlock("Here is the document to analyze:\n\n" + documentText),
			),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("claude api error: %w", err)
	}

	for _, block := range msg.Content {
		if block.Type == "text" {
			return parseExtractedCategories(block.Text)
		}
	}
	return nil, fmt.Errorf("no text content in response")
}

func parseExtractedCategories(raw string) ([]ExtractedCategory, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var categories []ExtractedCategory
	if err := json.Unmarshal([]byte(cleaned), &categories); err != nil {
		return nil, fmt.Errorf("parse categories: %w", err)
	}
	return categories, nil
}
