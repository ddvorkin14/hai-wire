package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"hai-wire/internal/classifier"
	"hai-wire/internal/config"
	"hai-wire/internal/db"
	slackclient "hai-wire/internal/slack"

	"github.com/slack-go/slack"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var slackChannelIDPattern = regexp.MustCompile(`^[CGDW][A-Z0-9]{8,}$`)

type App struct {
	ctx         context.Context
	db          *db.DB
	config      *config.Service
	slack       *slackclient.Client
	stopPoll    context.CancelFunc
	pollRunning bool
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	homeDir, _ := os.UserHomeDir()
	dataDir := filepath.Join(homeDir, ".hai-wire")
	os.MkdirAll(dataDir, 0755)

	database, err := db.New(filepath.Join(dataDir, "hai-wire.db"))
	if err != nil {
		runtime.LogFatalf(ctx, "failed to init db: %v", err)
	}
	a.db = database
	a.config = config.NewService(database)

	// Try to connect Slack from keychain on startup
	a.tryConnectSlack()
}

func (a *App) shutdown(ctx context.Context) {
	if a.stopPoll != nil {
		a.stopPoll()
	}
	if a.db != nil {
		a.db.Close()
	}
}

// RefreshSlackToken re-reads the token from keychain.
func (a *App) RefreshSlackToken() (string, error) {
	if a.slack != nil {
		a.slack.RefreshTokenIfNeeded()
		team, err := a.slack.ValidateConnection()
		if err != nil {
			// Token might be expired even after refresh -- try full reconnect
			return a.ReconnectSlack()
		}
		return team, nil
	}
	return a.ReconnectSlack()
}

func (a *App) tryConnectSlack() {
	client, err := slackclient.NewClientFromKeychain()
	if err != nil {
		log.Printf("Slack not available: %v", err)
		return
	}
	teamName, err := client.ValidateConnection()
	if err != nil {
		log.Printf("Slack token invalid: %v", err)
		return
	}
	a.slack = client
	a.config.SetSlackConnected("true")
	log.Printf("Slack connected to %s", teamName)

	// Preload user cache in background
	a.PreloadMentionTargets()
}

// --- Slack ---

func (a *App) IsSlackConnected() bool {
	return a.slack != nil
}

func (a *App) GetSlackStatus() map[string]string {
	if a.slack == nil {
		return map[string]string{
			"connected": "false",
			"message":   "Connect Slack MCP in Claude Code first (/mcp), then restart HAI-Wire.",
		}
	}
	teamName, _ := a.slack.ValidateConnection()
	return map[string]string{
		"connected": "true",
		"team":      teamName,
	}
}

func (a *App) ReconnectSlack() (string, error) {
	client, err := slackclient.NewClientFromKeychain()
	if err != nil {
		return "", err
	}
	teamName, err := client.ValidateConnection()
	if err != nil {
		return "", err
	}
	a.slack = client
	a.config.SetSlackConnected("true")
	return teamName, nil
}

func (a *App) ListSlackChannels() ([]slackclient.ChannelInfo, error) {
	if a.slack == nil {
		log.Printf("ListSlackChannels: slack is nil")
		return nil, fmt.Errorf("Slack not connected")
	}
	channels, err := a.slack.ListChannels()
	if err != nil {
		log.Printf("ListSlackChannels error: %v", err)
		return nil, err
	}
	log.Printf("ListSlackChannels: returning %d channels", len(channels))
	return channels, nil
}

// --- Config ---

func (a *App) IsSetupComplete() bool {
	return a.config.IsSetupComplete() && a.slack != nil
}

func (a *App) GetAllConfig() (map[string]string, error) {
	return a.config.GetAllConfig()
}

func (a *App) SaveAnthropicKey(key string) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return fmt.Errorf("API key cannot be empty")
	}
	if !strings.HasPrefix(key, "sk-ant-") {
		return fmt.Errorf("invalid Anthropic API key format (expected sk-ant-... prefix)")
	}
	return a.config.SetAnthropicKey(key)
}

func (a *App) SaveWatchChannel(channelID string) error {
	channelID = strings.TrimSpace(channelID)
	if !slackChannelIDPattern.MatchString(channelID) {
		return fmt.Errorf("invalid Slack channel ID format: %q", channelID)
	}
	return a.config.SetWatchChannelID(channelID)
}

func (a *App) SaveSquadConfig(squadName, pingGroup, triageChannelID string) error {
	squadName = strings.TrimSpace(squadName)
	if squadName == "" {
		return fmt.Errorf("squad name cannot be empty")
	}
	triageChannelID = strings.TrimSpace(triageChannelID)
	if !slackChannelIDPattern.MatchString(triageChannelID) {
		return fmt.Errorf("invalid triage channel ID format: %q", triageChannelID)
	}
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

// ResolveMentionName looks up a user/group ID and returns the display name.
func (a *App) ResolveMentionName(id string) string {
	if a.slack == nil || id == "" {
		return id
	}
	// Try user lookup first
	if len(id) > 0 && id[0] == 'U' {
		return a.slack.GetUserName(id)
	}
	return id
}

// TestNotification sends a test notification to verify they work.
func (a *App) TestNotification() {
	sendNotification("Test Notification", "If you see this, notifications are working!")
}

func (a *App) SaveAckReplyEnabled(val string) error {
	return a.config.SetAckReplyEnabled(val)
}

func (a *App) SaveConfidenceThreshold(threshold string) error {
	val, err := strconv.ParseFloat(strings.TrimSpace(threshold), 64)
	if err != nil || val < 0 || val > 1 {
		return fmt.Errorf("confidence threshold must be a number between 0 and 1, got %q", threshold)
	}
	return a.config.SetConfidenceThreshold(threshold)
}

// PreloadMentionTargets kicks off background loading of users+groups cache.
func (a *App) PreloadMentionTargets() {
	if a.slack == nil {
		return
	}
	watchChannel, _ := a.config.GetWatchChannelID()
	go a.slack.EnsureCacheLoaded(watchChannel)
}

type SearchResult struct {
	Items []slackclient.MentionTarget `json:"items"`
	Total int                         `json:"total"`
}

// SearchMentionTargets returns paginated, filtered results.
func (a *App) SearchMentionTargets(query string, offset int) (*SearchResult, error) {
	if a.slack == nil {
		return nil, fmt.Errorf("Slack not connected")
	}
	watchChannel, _ := a.config.GetWatchChannelID()
	a.slack.EnsureCacheLoaded(watchChannel)

	items, total, err := a.slack.SearchTargets(query, offset, 25)
	if err != nil {
		return nil, err
	}
	return &SearchResult{Items: items, Total: total}, nil
}

// TestWatchChannel verifies we can read from the watch channel (no message sent).
func (a *App) TestWatchChannel(channelID string) (string, error) {
	if a.slack == nil {
		return "", fmt.Errorf("Slack not connected")
	}
	msgs, err := a.slack.FetchNewMessages(channelID, "")
	if err != nil {
		return "", fmt.Errorf("Cannot read channel: %v", err)
	}
	return fmt.Sprintf("Connected -- %d recent messages found", len(msgs)), nil
}

// TestTriageChannel sends a test message to the triage channel to verify posting works.
func (a *App) TestTriageChannel(channelID string) (string, error) {
	if a.slack == nil {
		return "", fmt.Errorf("Slack not connected")
	}
	err := a.slack.PostToChannel(channelID, "HAI-Wire test -- if you see this, your triage channel is configured correctly.")
	if err != nil {
		return "", fmt.Errorf("Failed to post: %v", err)
	}
	return "Test message sent", nil
}

// --- Categories ---

// GetAllCategories returns custom categories if set, otherwise defaults.
func (a *App) GetAllCategories() []classifier.Category {
	if a.db.HasCustomCategories() {
		custom, err := a.db.GetCustomCategories()
		if err == nil && len(custom) > 0 {
			cats := make([]classifier.Category, len(custom))
			for i, c := range custom {
				cats[i] = classifier.Category{Key: c.Key, Name: c.Name, Description: c.Description}
			}
			return cats
		}
	}
	return classifier.AllCategories
}

// AnalyzeDocument sends document text to Claude and extracts categories from it.
// Also saves the document text for next-steps generation.
func (a *App) AnalyzeDocument(documentText string) ([]classifier.ExtractedCategory, error) {
	apiKey, _ := a.config.GetAnthropicKey()
	if apiKey == "" {
		return nil, fmt.Errorf("Anthropic API key not set -- configure it in Settings first")
	}
	// Save the runbook text for later use in next-steps
	a.config.SetRunbookText(documentText)
	return classifier.ExtractCategoriesFromDocument(a.ctx, apiKey, documentText)
}

// SaveCustomCategories saves extracted categories as the active category set.
func (a *App) SaveCustomCategories(categories []map[string]string) error {
	var cats []db.CustomCategory
	for _, c := range categories {
		cats = append(cats, db.CustomCategory{
			Key:         c["key"],
			Name:        c["name"],
			Description: c["description"],
		})
	}
	return a.db.SetCustomCategories(cats)
}

// ResetToDefaultCategories removes custom categories, reverting to the built-in set.
func (a *App) ResetToDefaultCategories() error {
	return a.db.SetCustomCategories(nil)
}

// HasCustomCategories returns whether custom categories are configured.
func (a *App) HasCustomCategories() bool {
	return a.db.HasCustomCategories()
}

// --- Monitoring ---

func (a *App) StartMonitoring() error {
	if a.pollRunning {
		return nil
	}
	if a.slack == nil {
		return fmt.Errorf("Slack not connected")
	}

	apiKey, _ := a.config.GetAnthropicKey()
	if apiKey == "" {
		return fmt.Errorf("Anthropic API key not set")
	}

	watchChannel, _ := a.config.GetWatchChannelID()
	if watchChannel == "" {
		return fmt.Errorf("Watch channel not set")
	}

	ctx, cancel := context.WithCancel(context.Background())
	a.stopPoll = cancel
	a.pollRunning = true

	go a.pollLoop(ctx)
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

// QueueMessage sends a classified message to the review queue.
func (a *App) QueueMessage(messageTS string) error {
	return a.db.UpdateMessageStatus(messageTS, "pending")
}

// UnrouteMessage reverts a routed message back to classified status.
func (a *App) UnrouteMessage(messageTS string) error {
	return a.db.UpdateMessageStatus(messageTS, "classified")
}

// --- Review Queue ---

func (a *App) GetPendingMessages() ([]db.ProcessedMessage, error) {
	return a.db.GetPendingMessages()
}

func (a *App) ApproveMessage(messageTS string) error {
	if a.slack == nil {
		return fmt.Errorf("Slack not connected")
	}

	// Get the message details
	msgs, _ := a.db.GetProcessedMessages(500)
	var msg *db.ProcessedMessage
	for _, m := range msgs {
		if m.MessageTS == messageTS {
			msg = &m
			break
		}
	}
	if msg == nil {
		return fmt.Errorf("message not found")
	}

	// Route it
	triageChannel, _ := a.config.GetTriageChannelID()
	pingGroup, _ := a.config.GetPingGroup()
	formattedPing := slackclient.FormatMention(pingGroup)
	watchChannel, _ := a.config.GetWatchChannelID()
	ownedCats, _ := a.db.GetOwnedCategories()
	catName := ownedCats[msg.Category]
	if catName == "" {
		catName = msg.Category
	}

	pct := int(msg.Confidence * 100)
	emoji := "🟡"
	if pct >= 80 {
		emoji = "🟢"
	} else if pct < 50 {
		emoji = "🔴"
	}
	permalink := a.slack.GetPermalink(watchChannel, msg.MessageTS)
	triageMsg := fmt.Sprintf("%s *[Confidence: %d%%] %s*\n\n*Summary:* %s\n\n*Original post:* %s\n*Posted by:* %s\n\n%s",
		emoji, pct, catName, msg.Summary, permalink, msg.Author, formattedPing)

	if err := a.slack.PostToChannel(triageChannel, triageMsg); err != nil {
		return fmt.Errorf("post to triage: %v", err)
	}
	ackEnabled, _ := a.config.GetAckReplyEnabled()
	if ackEnabled == "true" {
		a.slack.ReplyInThread(watchChannel, msg.MessageTS, "This support request has been analyzed and the appropriate team has been notified.")
	}

	return a.db.SetMessageRouted(messageTS)
}

func (a *App) RejectMessage(messageTS string) error {
	return a.db.UpdateMessageStatus(messageTS, "rejected")
}

// --- Auto-approval rules ---

func (a *App) GetAutoApprovalRules() ([]db.AutoApprovalRule, error) {
	return a.db.GetAutoApprovalRules()
}

func (a *App) SaveAutoApprovalRule(categoryKey string, minConfidence float64, enabled bool) error {
	return a.db.SaveAutoApprovalRule(db.AutoApprovalRule{
		CategoryKey:   categoryKey,
		MinConfidence: minConfidence,
		Enabled:       enabled,
	})
}

func (a *App) DeleteAutoApprovalRule(id int64) error {
	return a.db.DeleteAutoApprovalRule(id)
}

// GetNextSteps generates context-aware next steps using Claude + the uploaded runbook.
func (a *App) GetNextSteps(category, summary, status string) (string, error) {
	apiKey, _ := a.config.GetAnthropicKey()
	if apiKey == "" {
		return "", fmt.Errorf("API key not set")
	}
	runbook, _ := a.config.GetRunbookText()
	return classifier.GenerateNextSteps(a.ctx, apiKey, runbook, category, summary, status)
}

// GetMessageDetail returns full details for a message including thread replies.
func (a *App) GetMessageDetail(messageTS string) (map[string]interface{}, error) {
	if a.slack == nil {
		return nil, fmt.Errorf("Slack not connected")
	}

	channelID, _ := a.config.GetWatchChannelID()

	// Get thread replies
	a.slack.RefreshTokenIfNeeded()
	params := &slack.GetConversationRepliesParameters{
		ChannelID: channelID,
		Timestamp: messageTS,
		Limit:     50,
	}
	msgs, _, _, err := a.slack.GetAPI().GetConversationReplies(params)

	var replies []map[string]interface{}
	if err == nil {
		for _, m := range msgs {
			if m.Timestamp == messageTS {
				continue // Skip the parent message
			}
			userName := a.slack.GetUserName(m.User)
			replies = append(replies, map[string]interface{}{
				"author": userName,
				"text":   m.Text,
				"ts":     m.Timestamp,
			})
		}
	} else {
		log.Printf("GetMessageDetail thread error: %v", err)
	}

	// Get permalink
	permalink := a.slack.GetPermalink(channelID, messageTS)

	return map[string]interface{}{
		"replies":   replies,
		"permalink": permalink,
	}, nil
}

// --- Activity Log ---

func (a *App) GetProcessedMessages(limit int) ([]db.ProcessedMessage, error) {
	return a.db.GetProcessedMessages(limit)
}

// --- Poll Loop ---

func (a *App) pollLoop(ctx context.Context) {
	apiKey, _ := a.config.GetAnthropicKey()
	cls := classifier.NewClassifier(apiKey)

	// Load custom categories if available
	if a.db.HasCustomCategories() {
		custom, err := a.db.GetCustomCategories()
		if err == nil && len(custom) > 0 {
			cats := make([]classifier.Category, len(custom))
			for i, c := range custom {
				cats[i] = classifier.Category{Key: c.Key, Name: c.Name, Description: c.Description}
			}
			cls.SetCustomCategories(cats)
		}
	}

	watchChannel, _ := a.config.GetWatchChannelID()
	triageChannel, _ := a.config.GetTriageChannelID()
	pingGroup, _ := a.config.GetPingGroup()
	thresholdStr, _ := a.config.GetConfidenceThreshold()
	ownedCats, _ := a.db.GetOwnedCategories()

	threshold, err := strconv.ParseFloat(thresholdStr, 64)
	if err != nil || threshold <= 0 || threshold > 1 {
		threshold = 0.5
	}

	const (
		baseInterval = 30 * time.Second
		maxBackoff   = 5 * time.Minute
	)

	ticker := time.NewTicker(baseInterval)
	defer ticker.Stop()
	consecutiveErrors := 0

	log.Printf("Monitoring started: channel=%s, threshold=%.0f%%", watchChannel, threshold*100)

	// On start, classify the last 15 messages from the channel
	lastTS := ""
	initialMsgs, err := a.slack.FetchNewMessages(watchChannel, "")
	if err != nil {
		log.Printf("initial fetch error: %v", err)
	} else {
		// FetchNewMessages returns newest first, take last 15
		limit := 15
		if len(initialMsgs) < limit {
			limit = len(initialMsgs)
		}
		for _, msg := range initialMsgs[:limit] {
			if msg.BotID != "" || (msg.ThreadTimestamp != "" && msg.ThreadTimestamp != msg.Timestamp) || msg.SubType != "" || msg.Text == "" {
				continue
			}
			if msg.Timestamp > lastTS {
				lastTS = msg.Timestamp
			}
			a.processMessage(ctx, cls, msg.Timestamp, msg.User, msg.Text, watchChannel, triageChannel, pingGroup, threshold, ownedCats)
		}
	}
	if lastTS == "" {
		lastTS = fmt.Sprintf("%d.000000", time.Now().Unix())
	}

	for {
		select {
		case <-ctx.Done():
			a.pollRunning = false
			log.Printf("Monitoring stopped")
			return
		case <-ticker.C:
			messages, err := a.slack.FetchNewMessages(watchChannel, lastTS)
			if err != nil {
				consecutiveErrors++
				backoff := baseInterval * time.Duration(1<<uint(consecutiveErrors-1))
				if backoff > maxBackoff {
					backoff = maxBackoff
				}
				log.Printf("poll error (retry in %v): %v", backoff, err)
				ticker.Reset(backoff)
				continue
			}

			// Reset backoff on success
			if consecutiveErrors > 0 {
				consecutiveErrors = 0
				ticker.Reset(baseInterval)
			}

			for _, msg := range messages {
				if msg.BotID != "" || (msg.ThreadTimestamp != "" && msg.ThreadTimestamp != msg.Timestamp) || msg.SubType != "" || msg.Text == "" {
					continue
				}
				if msg.Timestamp <= lastTS {
					continue
				}
				lastTS = msg.Timestamp
				a.processMessage(ctx, cls, msg.Timestamp, msg.User, msg.Text, watchChannel, triageChannel, pingGroup, threshold, ownedCats)
			}
		}
	}
}

func sendNotification(title, body string) {
	// Sanitize inputs to prevent osascript injection — remove quotes and backslashes
	sanitize := func(s string) string {
		s = strings.ReplaceAll(s, `\`, `\\`)
		s = strings.ReplaceAll(s, `"`, `\"`)
		return s
	}
	exec.Command("osascript", "-e", fmt.Sprintf(`display notification "%s" with title "HAI-Wire" subtitle "%s"`, sanitize(body), sanitize(title))).Start()
}

func (a *App) processMessage(ctx context.Context, cls *classifier.Classifier, ts, userID, text, watchChannel, triageChannel, pingGroup string, threshold float64, ownedCats map[string]string) {
	processed, _ := a.db.IsMessageProcessed(ts)
	if processed {
		return
	}

	result, err := cls.Classify(ctx, text)
	if err != nil {
		log.Printf("classify error: %v", err)
		return
	}

	authorName := a.slack.GetUserName(userID)
	_, owned := ownedCats[result.Category]
	matchesSquad := owned && result.Confidence >= threshold

	// Determine status: auto-queue if rules match or category is owned, otherwise classified
	status := "classified"
	routed := false
	if matchesSquad {
		status = "pending"
	}

	dbMsg := db.ProcessedMessage{
		MessageTS:  ts,
		ChannelID:  watchChannel,
		Author:     authorName,
		Category:   result.Category,
		Confidence: result.Confidence,
		Summary:    result.Summary,
		Reasoning:  result.Reasoning,
		Routed:     routed,
		Status:     status,
	}
	a.db.SaveProcessedMessage(dbMsg)

	runtime.EventsEmit(a.ctx, "triage:event", map[string]interface{}{
		"message_ts": ts,
		"author":     authorName,
		"category":   result.Category,
		"confidence": result.Confidence,
		"summary":    result.Summary,
		"reasoning":  result.Reasoning,
		"routed":     routed,
		"status":     status,
	})

	// Send native notification when something is queued
	if status == "pending" {
		sendNotification("New item in queue", fmt.Sprintf("%s - %s (%d%%)", authorName, result.Summary, int(result.Confidence*100)))
	}
}
