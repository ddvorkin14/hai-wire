package classifier

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

type ClassificationResult struct {
	Category   string  `json:"category"`
	Confidence float64 `json:"confidence"`
	Summary    string  `json:"summary"`
	Reasoning  string  `json:"reasoning"`
}

type Classifier struct {
	client           anthropic.Client
	customCategories []Category
}

func NewClassifier(apiKey string) *Classifier {
	client := anthropic.NewClient(option.WithAPIKey(apiKey))
	return &Classifier{client: client}
}

// SetCustomCategories overrides the default categories with custom ones.
func (c *Classifier) SetCustomCategories(cats []Category) {
	c.customCategories = cats
}

func (c *Classifier) getCategories() []Category {
	if len(c.customCategories) > 0 {
		return c.customCategories
	}
	return AllCategories
}

func (c *Classifier) Classify(ctx context.Context, messageText string) (*ClassificationResult, error) {
	systemPrompt := buildSystemPromptFromCategories(c.getCategories())

	msg, err := c.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeSonnet4_5,
		MaxTokens: 1024,
		System: []anthropic.TextBlockParam{
			{Text: systemPrompt},
		},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(
				anthropic.NewTextBlock("Classify this support request:\n\n" + messageText),
			),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("claude api error: %w", err)
	}

	for _, block := range msg.Content {
		if block.Type == "text" {
			return parseClassification(block.Text)
		}
	}
	return nil, fmt.Errorf("no text content in response")
}

func buildSystemPromptFromCategories(categories []Category) string {
	var sb strings.Builder
	sb.WriteString(`You are a support request triage classifier.

You will receive a support request. Classify it into exactly one of the following categories and provide a confidence score.

Categories:
`)
	for _, cat := range categories {
		sb.WriteString(fmt.Sprintf("- %s (%s): %s\n", cat.Key, cat.Name, cat.Description))
	}

	sb.WriteString(`
Respond with ONLY valid JSON in this exact format:
{
  "category": "<category_key>",
  "confidence": <0.0 to 1.0>,
  "summary": "<one sentence summary of the issue>",
  "reasoning": "<brief explanation of why this category>"
}

Rules:
- confidence should reflect how certain you are about the category
- If a message could belong to multiple categories, pick the best fit and lower the confidence
- If the message is not a support request (e.g., a reply, a question about process), use category "not_support_request" with appropriate confidence
`)
	return sb.String()
}

func parseClassification(raw string) (*ClassificationResult, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var result ClassificationResult
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		return nil, fmt.Errorf("parse classification: %w", err)
	}
	return &result, nil
}
