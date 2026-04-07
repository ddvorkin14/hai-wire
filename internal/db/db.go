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
	Routed     bool
	CreatedAt  time.Time
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
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_processed_messages_ts ON processed_messages(message_ts);
	CREATE INDEX IF NOT EXISTS idx_processed_messages_created ON processed_messages(created_at);
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
	_, err := d.conn.Exec(
		`INSERT INTO processed_messages (message_ts, channel_id, author, category, confidence, summary, reasoning, routed)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		msg.MessageTS, msg.ChannelID, msg.Author, msg.Category, msg.Confidence, msg.Summary, msg.Reasoning, msg.Routed,
	)
	return err
}

func (d *DB) GetProcessedMessages(limit int) ([]ProcessedMessage, error) {
	rows, err := d.conn.Query(
		"SELECT id, message_ts, channel_id, author, category, confidence, summary, reasoning, routed, created_at FROM processed_messages ORDER BY created_at DESC LIMIT ?",
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []ProcessedMessage
	for rows.Next() {
		var m ProcessedMessage
		if err := rows.Scan(&m.ID, &m.MessageTS, &m.ChannelID, &m.Author, &m.Category, &m.Confidence, &m.Summary, &m.Reasoning, &m.Routed, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}
