package main

import (
	"context"
	"os"
	"path/filepath"

	"hai-wire/internal/classifier"
	"hai-wire/internal/config"
	"hai-wire/internal/db"
	slackclient "hai-wire/internal/slack"
	"hai-wire/internal/triage"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx          context.Context
	db           *db.DB
	config       *config.Service
	orchestrator *triage.Orchestrator
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
}

func (a *App) shutdown(ctx context.Context) {
	if a.orchestrator != nil {
		a.orchestrator.Stop()
	}
	if a.db != nil {
		a.db.Close()
	}
}

// --- Config bindings ---

func (a *App) IsSetupComplete() bool {
	return a.config.IsSetupComplete()
}

func (a *App) GetAllConfig() (map[string]string, error) {
	return a.config.GetAllConfig()
}

func (a *App) SaveSlackTokens(botToken, appToken string) (string, error) {
	teamName, err := slackclient.ValidateTokens(botToken, appToken)
	if err != nil {
		return "", err
	}
	if err := a.config.SetSlackBotToken(botToken); err != nil {
		return "", err
	}
	if err := a.config.SetSlackAppToken(appToken); err != nil {
		return "", err
	}
	return teamName, nil
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

// --- Slack bindings ---

func (a *App) ListSlackChannels() ([]slackclient.ChannelInfo, error) {
	botToken, err := a.config.GetSlackBotToken()
	if err != nil || botToken == "" {
		return nil, err
	}
	appToken, err := a.config.GetSlackAppToken()
	if err != nil || appToken == "" {
		return nil, err
	}
	client := slackclient.NewClient(botToken, appToken)
	return client.ListChannels()
}

// --- Category bindings ---

func (a *App) GetAllCategories() []classifier.Category {
	return classifier.AllCategories
}

// --- Triage bindings ---

func (a *App) StartMonitoring() error {
	if a.orchestrator != nil && a.orchestrator.IsRunning() {
		return nil
	}

	botToken, _ := a.config.GetSlackBotToken()
	appToken, _ := a.config.GetSlackAppToken()
	apiKey, _ := a.config.GetAnthropicKey()

	sc := slackclient.NewClient(botToken, appToken)
	cls := classifier.NewClassifier(apiKey)
	a.orchestrator = triage.NewOrchestrator(a.db, a.config, cls, sc)

	a.orchestrator.SetEventCallback(func(event triage.Event) {
		runtime.EventsEmit(a.ctx, "triage:event", event)
	})

	return a.orchestrator.Start()
}

func (a *App) StopMonitoring() {
	if a.orchestrator != nil {
		a.orchestrator.Stop()
	}
}

func (a *App) IsMonitoring() bool {
	return a.orchestrator != nil && a.orchestrator.IsRunning()
}

// --- Activity log bindings ---

func (a *App) GetProcessedMessages(limit int) ([]db.ProcessedMessage, error) {
	return a.db.GetProcessedMessages(limit)
}
