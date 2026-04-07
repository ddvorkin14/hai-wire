package triage

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"sync"
	"time"

	"hai-wire/internal/classifier"
	"hai-wire/internal/config"
	"hai-wire/internal/db"
	slackclient "hai-wire/internal/slack"
)

type Event struct {
	MessageTS  string  `json:"message_ts"`
	Author     string  `json:"author"`
	Category   string  `json:"category"`
	Confidence float64 `json:"confidence"`
	Summary    string  `json:"summary"`
	Routed     bool    `json:"routed"`
}

type EventCallback func(event Event)

type Orchestrator struct {
	db         *db.DB
	config     *config.Service
	classifier *classifier.Classifier
	slack      *slackclient.Client
	onEvent    EventCallback
	cancel     context.CancelFunc
	mu         sync.Mutex
	running    bool
	lastPollTS string
}

func NewOrchestrator(database *db.DB, cfg *config.Service, cls *classifier.Classifier, sc *slackclient.Client) *Orchestrator {
	return &Orchestrator{
		db:         database,
		config:     cfg,
		classifier: cls,
		slack:      sc,
	}
}

func (o *Orchestrator) SetEventCallback(cb EventCallback) {
	o.onEvent = cb
}

func (o *Orchestrator) Start() error {
	o.mu.Lock()
	defer o.mu.Unlock()
	if o.running {
		return fmt.Errorf("already running")
	}

	watchChannel, err := o.config.GetWatchChannelID()
	if err != nil || watchChannel == "" {
		return fmt.Errorf("watch channel not configured")
	}

	ctx, cancel := context.WithCancel(context.Background())
	o.cancel = cancel
	o.running = true

	// Set initial poll timestamp to now (only process new messages)
	o.lastPollTS = fmt.Sprintf("%d.000000", time.Now().Unix())

	go o.pollLoop(ctx, watchChannel)

	return nil
}

func (o *Orchestrator) Stop() {
	o.mu.Lock()
	defer o.mu.Unlock()
	if o.cancel != nil {
		o.cancel()
		o.running = false
	}
}

func (o *Orchestrator) IsRunning() bool {
	o.mu.Lock()
	defer o.mu.Unlock()
	return o.running
}

func (o *Orchestrator) pollLoop(ctx context.Context, watchChannel string) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Do an initial poll immediately
	o.poll(ctx, watchChannel)

	for {
		select {
		case <-ctx.Done():
			o.mu.Lock()
			o.running = false
			o.mu.Unlock()
			return
		case <-ticker.C:
			o.poll(ctx, watchChannel)
		}
	}
}

func (o *Orchestrator) poll(ctx context.Context, watchChannel string) {
	messages, err := o.slack.FetchNewMessages(watchChannel, o.lastPollTS)
	if err != nil {
		log.Printf("poll error: %v", err)
		return
	}

	for _, msg := range messages {
		// Update last poll timestamp
		if msg.Timestamp > o.lastPollTS {
			o.lastPollTS = msg.Timestamp
		}

		o.handleMessage(ctx, msg.ChannelID, msg.Timestamp, msg.UserID, msg.Text)
	}
}

func (o *Orchestrator) handleMessage(ctx context.Context, channelID, messageTS, userID, text string) {
	processed, err := o.db.IsMessageProcessed(messageTS)
	if err != nil {
		log.Printf("dedup check error: %v", err)
		return
	}
	if processed {
		return
	}

	result, err := o.classifier.Classify(ctx, text)
	if err != nil {
		log.Printf("classification error: %v", err)
		return
	}

	ownedCats, err := o.db.GetOwnedCategories()
	if err != nil {
		log.Printf("get owned categories error: %v", err)
		return
	}

	thresholdStr, _ := o.config.GetConfidenceThreshold()
	threshold, _ := strconv.ParseFloat(thresholdStr, 64)
	if threshold == 0 {
		threshold = 0.5
	}

	routed := shouldRoute(result.Category, result.Confidence, ownedCats, threshold)

	authorName := o.slack.GetUserName(userID)
	msg := db.ProcessedMessage{
		MessageTS:  messageTS,
		ChannelID:  channelID,
		Author:     authorName,
		Category:   result.Category,
		Confidence: result.Confidence,
		Summary:    result.Summary,
		Reasoning:  result.Reasoning,
		Routed:     routed,
	}
	if err := o.db.SaveProcessedMessage(msg); err != nil {
		log.Printf("save message error: %v", err)
		return
	}

	if routed {
		triageChannel, _ := o.config.GetTriageChannelID()
		pingGroup, _ := o.config.GetPingGroup()
		permalink := o.slack.GetPermalink(channelID, messageTS)
		catName := ownedCats[result.Category]

		triageMsg := formatTriageMessage(catName, result.Confidence, result.Summary, permalink, authorName, pingGroup)
		if err := o.slack.PostToChannel(triageChannel, triageMsg); err != nil {
			log.Printf("post to triage error: %v", err)
		}

		threadReply := "This support request has been analyzed and the appropriate team has been notified."
		if err := o.slack.ReplyInThread(channelID, messageTS, threadReply); err != nil {
			log.Printf("thread reply error: %v", err)
		}
	}

	if o.onEvent != nil {
		o.onEvent(Event{
			MessageTS:  messageTS,
			Author:     authorName,
			Category:   result.Category,
			Confidence: result.Confidence,
			Summary:    result.Summary,
			Routed:     routed,
		})
	}
}

func shouldRoute(category string, confidence float64, ownedCategories map[string]string, threshold float64) bool {
	_, owned := ownedCategories[category]
	return owned && confidence >= threshold
}

func formatTriageMessage(categoryName string, confidence float64, summary, permalink, author, pingGroup string) string {
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
