package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"hai-wire/internal/classifier"
	"hai-wire/internal/config"
	"hai-wire/internal/db"
	slackclient "hai-wire/internal/slack"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx       context.Context
	db        *db.DB
	config    *config.Service
	slack     *slackclient.MCPClient
	dataDir   string
	stopPoll  context.CancelFunc
	pollRunning bool
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	homeDir, _ := os.UserHomeDir()
	a.dataDir = filepath.Join(homeDir, ".hai-wire")
	os.MkdirAll(a.dataDir, 0755)

	database, err := db.New(filepath.Join(a.dataDir, "hai-wire.db"))
	if err != nil {
		runtime.LogFatalf(ctx, "failed to init db: %v", err)
	}
	a.db = database
	a.config = config.NewService(database)
	a.slack = slackclient.NewMCPClient(a.dataDir)

	// Try to reconnect with saved token
	if a.slack != nil {
		go func() {
			_ = a.slack.Reconnect(context.Background())
		}()
	}
}

func (a *App) shutdown(ctx context.Context) {
	if a.stopPoll != nil {
		a.stopPoll()
	}
	if a.slack != nil {
		a.slack.Close()
	}
	if a.db != nil {
		a.db.Close()
	}
}

// --- Slack connection ---

// ConnectSlack opens the browser for Slack OAuth. Returns workspace name.
func (a *App) ConnectSlack() (string, error) {
	log.Printf("ConnectSlack: starting OAuth flow...")
	teamName, err := a.slack.Connect(a.ctx)
	if err != nil {
		log.Printf("ConnectSlack error: %v", err)
		return "", fmt.Errorf("Slack connection failed: %v", err)
	}
	log.Printf("ConnectSlack: connected to %s", teamName)
	a.config.SetSlackConnected("true")
	return teamName, nil
}

// IsSlackConnected checks if we have a valid Slack connection.
func (a *App) IsSlackConnected() bool {
	return a.slack.IsConnected()
}

// GetSlackAuthURL returns the last OAuth URL for manual copy-paste.
func (a *App) GetSlackAuthURL() string {
	return a.slack.GetLastAuthURL()
}

// --- Config bindings ---

func (a *App) IsSetupComplete() bool {
	return a.config.IsSetupComplete()
}

func (a *App) GetAllConfig() (map[string]string, error) {
	return a.config.GetAllConfig()
}

func (a *App) SaveAnthropicKey(key string) error {
	return a.config.SetAnthropicKey(key)
}

func (a *App) SaveWatchChannel(channelID string) error {
	return a.config.SetWatchChannelID(channelID)
}

func (a *App) SaveSquadConfig(squadName, pingGroup, triageChannelID string) error {
	if err := a.config.SetSquadName(squadName); err != nil {
		return err
	}
	if err := a.config.SetPingGroup(pingGroup); err != nil {
		return err
	}
	return a.config.SetTriageChannelID(triageChannelID)
}

func (a *App) SaveOwnedCategories(categories map[string]string) error {
	return a.db.SetOwnedCategories(categories)
}

func (a *App) GetOwnedCategories() (map[string]string, error) {
	return a.db.GetOwnedCategories()
}

func (a *App) SaveConfidenceThreshold(threshold string) error {
	return a.config.SetConfidenceThreshold(threshold)
}

// --- Slack channel bindings ---

func (a *App) ListSlackChannels() ([]slackclient.ChannelInfo, error) {
	if !a.slack.IsConnected() {
		return nil, nil
	}
	return a.slack.ListChannels(a.ctx)
}

// --- Category bindings ---

func (a *App) GetAllCategories() []classifier.Category {
	return classifier.AllCategories
}

// --- Monitoring bindings ---

func (a *App) StartMonitoring() error {
	if a.pollRunning {
		return nil
	}

	if !a.slack.IsConnected() {
		return fmt.Errorf("Slack not connected")
	}

	apiKey, _ := a.config.GetAnthropicKey()
	cls := classifier.NewClassifier(apiKey)

	watchChannel, _ := a.config.GetWatchChannelID()
	triageChannel, _ := a.config.GetTriageChannelID()
	pingGroup, _ := a.config.GetPingGroup()
	thresholdStr, _ := a.config.GetConfidenceThreshold()

	ownedCats, _ := a.db.GetOwnedCategories()

	ctx, cancel := context.WithCancel(context.Background())
	a.stopPoll = cancel
	a.pollRunning = true

	go pollLoop(ctx, a, cls, watchChannel, triageChannel, pingGroup, thresholdStr, ownedCats)

	return nil
}

func (a *App) StopMonitoring() {
	if a.stopPoll != nil {
		a.stopPoll()
		a.pollRunning = false
	}
}

func (a *App) IsMonitoring() bool {
	return a.pollRunning
}

// --- Activity log bindings ---

func (a *App) GetProcessedMessages(limit int) ([]db.ProcessedMessage, error) {
	return a.db.GetProcessedMessages(limit)
}

// --- Poll loop ---

func pollLoop(ctx context.Context, a *App, cls *classifier.Classifier, watchChannel, triageChannel, pingGroup, thresholdStr string, ownedCats map[string]string) {
	lastTS := fmt.Sprintf("%d.000000", time.Now().Unix())
	threshold, _ := strconv.ParseFloat(thresholdStr, 64)
	if threshold == 0 {
		threshold = 0.5
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			a.pollRunning = false
			return
		case <-ticker.C:
			raw, err := a.slack.ReadChannel(ctx, watchChannel, 20, lastTS)
			if err != nil {
				log.Printf("poll error: %v", err)
				continue
			}

			// Parse messages from MCP response and classify
			// MCP returns markdown-formatted text, we process each message block
			messages := parseSlackMessages(raw)
			for _, msg := range messages {
				if msg.ts <= lastTS {
					continue
				}
				if msg.ts > lastTS {
					lastTS = msg.ts
				}

				processed, _ := a.db.IsMessageProcessed(msg.ts)
				if processed {
					continue
				}

				result, err := cls.Classify(ctx, msg.text)
				if err != nil {
					log.Printf("classify error: %v", err)
					continue
				}

				_, owned := ownedCats[result.Category]
				routed := owned && result.Confidence >= threshold

				dbMsg := db.ProcessedMessage{
					MessageTS:  msg.ts,
					ChannelID:  watchChannel,
					Author:     msg.author,
					Category:   result.Category,
					Confidence: result.Confidence,
					Summary:    result.Summary,
					Reasoning:  result.Reasoning,
					Routed:     routed,
				}
				a.db.SaveProcessedMessage(dbMsg)

				if routed {
					catName := ownedCats[result.Category]
					pct := int(result.Confidence * 100)
					emoji := "🟡"
					if pct >= 80 {
						emoji = "🟢"
					} else if pct < 50 {
						emoji = "🔴"
					}

					triageMsg := fmt.Sprintf("%s *[Confidence: %d%%] %s*\n\n*Summary:* %s\n\n*Posted by:* %s\n\n%s",
						emoji, pct, catName, result.Summary, msg.author, pingGroup)
					a.slack.SendMessage(ctx, triageChannel, triageMsg)
				}

				runtime.EventsEmit(a.ctx, "triage:event", map[string]interface{}{
					"message_ts": msg.ts,
					"author":     msg.author,
					"category":   result.Category,
					"confidence": result.Confidence,
					"summary":    result.Summary,
					"routed":     routed,
				})
			}
		}
	}
}

type slackMsg struct {
	ts     string
	author string
	text   string
}

// parseSlackMessages extracts message data from MCP markdown response.
func parseSlackMessages(raw string) []slackMsg {
	// MCP returns formatted markdown. We need to extract individual messages.
	// Format: "=== Message from Author (UserID) at Date ===" followed by content
	var messages []slackMsg
	lines := splitLines(raw)
	var current *slackMsg

	for _, line := range lines {
		if len(line) > 20 && line[:4] == "=== " {
			if current != nil && current.text != "" {
				messages = append(messages, *current)
			}
			current = &slackMsg{}
			// Extract author from "=== Message from Author (UserID) at Date ==="
			current.author = extractAuthor(line)
		} else if len(line) > 12 && line[:12] == "Message TS: " {
			if current != nil {
				current.ts = line[12:]
			}
		} else if current != nil {
			if current.text != "" {
				current.text += "\n"
			}
			current.text += line
		}
	}
	if current != nil && current.text != "" {
		messages = append(messages, *current)
	}
	return messages
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}

func extractAuthor(line string) string {
	// "=== Message from Author Name (UserID) at 2026-... ==="
	const prefix = "=== Message from "
	if len(line) < len(prefix) {
		return "Unknown"
	}
	rest := line[len(prefix):]
	// Find the " (" before UserID
	for i := 0; i < len(rest); i++ {
		if i+1 < len(rest) && rest[i] == '(' && rest[i-1] == ' ' {
			return rest[:i-1]
		}
	}
	return "Unknown"
}
