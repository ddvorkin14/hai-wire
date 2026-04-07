package db

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

type ProcessedMessage struct {
	ID         int64
	MessageTS  string
	ChannelID  string
	Author     string
	Category   string
	Confidence float64
	Summary    string
	Reasoning  string
	Routed    bool
	Status    string // "classified", "pending", "approved", "rejected"
	CreatedAt time.Time
}

type AutoApprovalRule struct {
	ID            int64
	CategoryKey   string  // empty = all categories
	MinConfidence float64 // 0.0 - 1.0
	Enabled       bool
}

func New(path string) (*DB, error) {
	conn, err := sql.Open("sqlite", path+"?_journal_mode=WAL")
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return db, nil
}

func (d *DB) Close() error {
	return d.conn.Close()
}

func (d *DB) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS config (
		key   TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS owned_categories (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		category_key  TEXT NOT NULL UNIQUE,
		category_name TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS processed_messages (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		message_ts TEXT NOT NULL UNIQUE,
		channel_id TEXT NOT NULL,
		author     TEXT NOT NULL,
		category   TEXT NOT NULL,
		confidence REAL NOT NULL,
		summary    TEXT NOT NULL,
		reasoning  TEXT NOT NULL,
		routed     BOOLEAN NOT NULL DEFAULT 0,
		status     TEXT NOT NULL DEFAULT 'classified',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_processed_messages_ts ON processed_messages(message_ts);
	CREATE INDEX IF NOT EXISTS idx_processed_messages_created ON processed_messages(created_at);
	CREATE INDEX IF NOT EXISTS idx_processed_messages_status ON processed_messages(status);
	CREATE TABLE IF NOT EXISTS custom_categories (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		key         TEXT NOT NULL UNIQUE,
		name        TEXT NOT NULL,
		description TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS auto_approval_rules (
		id             INTEGER PRIMARY KEY AUTOINCREMENT,
		category_key   TEXT,
		min_confidence REAL NOT NULL DEFAULT 0,
		enabled        BOOLEAN NOT NULL DEFAULT 1
	);
	`
	_, err := d.conn.Exec(schema)
	return err
}

func (d *DB) SetConfig(key, value string) error {
	_, err := d.conn.Exec(
		"INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
		key, value,
	)
	return err
}

func (d *DB) GetConfig(key string) (string, error) {
	var value string
	err := d.conn.QueryRow("SELECT value FROM config WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

func (d *DB) SetOwnedCategories(categories map[string]string) error {
	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM owned_categories")
	if err != nil {
		return err
	}
	for key, name := range categories {
		_, err = tx.Exec("INSERT INTO owned_categories (category_key, category_name) VALUES (?, ?)", key, name)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (d *DB) GetOwnedCategories() (map[string]string, error) {
	rows, err := d.conn.Query("SELECT category_key, category_name FROM owned_categories")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cats := make(map[string]string)
	for rows.Next() {
		var key, name string
		if err := rows.Scan(&key, &name); err != nil {
			return nil, err
		}
		cats[key] = name
	}
	return cats, rows.Err()
}

func (d *DB) IsMessageProcessed(messageTS string) (bool, error) {
	var count int
	err := d.conn.QueryRow("SELECT COUNT(*) FROM processed_messages WHERE message_ts = ?", messageTS).Scan(&count)
	return count > 0, err
}

func (d *DB) SaveProcessedMessage(msg ProcessedMessage) error {
	status := msg.Status
	if status == "" {
		status = "classified"
	}
	_, err := d.conn.Exec(
		`INSERT INTO processed_messages (message_ts, channel_id, author, category, confidence, summary, reasoning, routed, status)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		msg.MessageTS, msg.ChannelID, msg.Author, msg.Category, msg.Confidence, msg.Summary, msg.Reasoning, msg.Routed, status,
	)
	return err
}

// UpdateMessageStatus changes the status of a processed message.
func (d *DB) UpdateMessageStatus(messageTS, status string) error {
	_, err := d.conn.Exec("UPDATE processed_messages SET status = ? WHERE message_ts = ?", status, messageTS)
	return err
}

// SetMessageRouted marks a message as routed.
func (d *DB) SetMessageRouted(messageTS string) error {
	_, err := d.conn.Exec("UPDATE processed_messages SET routed = 1, status = 'approved' WHERE message_ts = ?", messageTS)
	return err
}

// GetPendingMessages returns messages awaiting review.
func (d *DB) GetPendingMessages() ([]ProcessedMessage, error) {
	return d.queryMessages("SELECT id, message_ts, channel_id, author, category, confidence, summary, reasoning, routed, COALESCE(status,'classified'), created_at FROM processed_messages WHERE status = 'pending' ORDER BY created_at DESC")
}

// GetMessagesByStatus returns messages with a given status.
func (d *DB) GetMessagesByStatus(status string, limit int) ([]ProcessedMessage, error) {
	return d.queryMessages(fmt.Sprintf("SELECT id, message_ts, channel_id, author, category, confidence, summary, reasoning, routed, COALESCE(status,'classified'), created_at FROM processed_messages WHERE status = '%s' ORDER BY created_at DESC LIMIT %d", status, limit))
}

func (d *DB) GetProcessedMessages(limit int) ([]ProcessedMessage, error) {
	return d.queryMessages(fmt.Sprintf("SELECT id, message_ts, channel_id, author, category, confidence, summary, reasoning, routed, COALESCE(status,'classified'), created_at FROM processed_messages ORDER BY created_at DESC LIMIT %d", limit))
}

func (d *DB) queryMessages(query string) ([]ProcessedMessage, error) {
	rows, err := d.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []ProcessedMessage
	for rows.Next() {
		var m ProcessedMessage
		if err := rows.Scan(&m.ID, &m.MessageTS, &m.ChannelID, &m.Author, &m.Category, &m.Confidence, &m.Summary, &m.Reasoning, &m.Routed, &m.Status, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

// --- Custom categories ---

type CustomCategory struct {
	ID          int64
	Key         string
	Name        string
	Description string
}

func (d *DB) SetCustomCategories(cats []CustomCategory) error {
	tx, err := d.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	_, err = tx.Exec("DELETE FROM custom_categories")
	if err != nil {
		return err
	}
	for _, c := range cats {
		_, err = tx.Exec("INSERT INTO custom_categories (key, name, description) VALUES (?, ?, ?)", c.Key, c.Name, c.Description)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (d *DB) GetCustomCategories() ([]CustomCategory, error) {
	rows, err := d.conn.Query("SELECT id, key, name, description FROM custom_categories ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cats []CustomCategory
	for rows.Next() {
		var c CustomCategory
		if err := rows.Scan(&c.ID, &c.Key, &c.Name, &c.Description); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (d *DB) HasCustomCategories() bool {
	var count int
	d.conn.QueryRow("SELECT COUNT(*) FROM custom_categories").Scan(&count)
	return count > 0
}

// --- Auto-approval rules ---

func (d *DB) SaveAutoApprovalRule(rule AutoApprovalRule) error {
	if rule.ID > 0 {
		_, err := d.conn.Exec("UPDATE auto_approval_rules SET category_key = ?, min_confidence = ?, enabled = ? WHERE id = ?",
			rule.CategoryKey, rule.MinConfidence, rule.Enabled, rule.ID)
		return err
	}
	_, err := d.conn.Exec("INSERT INTO auto_approval_rules (category_key, min_confidence, enabled) VALUES (?, ?, ?)",
		rule.CategoryKey, rule.MinConfidence, rule.Enabled)
	return err
}

func (d *DB) GetAutoApprovalRules() ([]AutoApprovalRule, error) {
	rows, err := d.conn.Query("SELECT id, COALESCE(category_key,''), min_confidence, enabled FROM auto_approval_rules ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []AutoApprovalRule
	for rows.Next() {
		var r AutoApprovalRule
		if err := rows.Scan(&r.ID, &r.CategoryKey, &r.MinConfidence, &r.Enabled); err != nil {
			return nil, err
		}
		rules = append(rules, r)
	}
	return rules, rows.Err()
}

func (d *DB) DeleteAutoApprovalRule(id int64) error {
	_, err := d.conn.Exec("DELETE FROM auto_approval_rules WHERE id = ?", id)
	return err
}

// CheckAutoApproval returns true if a message matches any enabled auto-approval rule.
func (d *DB) CheckAutoApproval(category string, confidence float64) (bool, error) {
	rules, err := d.GetAutoApprovalRules()
	if err != nil {
		return false, err
	}
	for _, r := range rules {
		if !r.Enabled {
			continue
		}
		categoryMatch := r.CategoryKey == "" || r.CategoryKey == category
		confidenceMatch := confidence >= r.MinConfidence
		if categoryMatch && confidenceMatch {
			return true, nil
		}
	}
	return false, nil
}
