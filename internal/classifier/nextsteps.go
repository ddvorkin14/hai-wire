package classifier

import (
	"context"
	"fmt"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

// GenerateNextSteps uses Claude to suggest next steps based on the runbook and message context.
func GenerateNextSteps(ctx context.Context, apiKey, runbookText, category, summary, status string) (string, error) {
	client := anthropic.NewClient(option.WithAPIKey(apiKey))

	var sb strings.Builder
	sb.WriteString(`You are a support triage assistant. Based on the runbook documentation and the classified support request below, suggest 3-5 specific, actionable next steps for handling this request.

Be concise. Each step should be one sentence. Number them.`)

	if runbookText != "" {
		sb.WriteString("\n\nRunbook/Documentation:\n")
		// Truncate if too long
		if len(runbookText) > 4000 {
			sb.WriteString(runbookText[:4000])
			sb.WriteString("\n... (truncated)")
		} else {
			sb.WriteString(runbookText)
		}
	}

	userMsg := fmt.Sprintf("Category: %s\nSummary: %s\nCurrent status: %s\n\nWhat are the next steps to handle this request?", category, summary, status)

	msg, err := client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeSonnet4_5,
		MaxTokens: 512,
		System: []anthropic.TextBlockParam{
			{Text: sb.String()},
		},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(
				anthropic.NewTextBlock(userMsg),
			),
		},
	})
	if err != nil {
		return "", fmt.Errorf("claude error: %w", err)
	}

	for _, block := range msg.Content {
		if block.Type == "text" {
			return block.Text, nil
		}
	}
	return "", fmt.Errorf("no response")
}
