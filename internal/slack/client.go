package slack

import (
	"fmt"
	"log"

	"github.com/slack-go/slack"
)

type ChannelInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Message struct {
	ChannelID string
	Timestamp string
	UserID    string
	Text      string
}

type Client struct {
	api *slack.Client
}

// NewClient creates a client from a user OAuth token (xoxp-... or xoxe.xoxp-...).
func NewClient(token string) *Client {
	api := slack.New(token)
	return &Client{api: api}
}

// ValidateToken checks the token is valid and returns the workspace name.
func ValidateToken(token string) (string, error) {
	api := slack.New(token)
	resp, err := api.AuthTest()
	if err != nil {
		return "", fmt.Errorf("invalid token: %w", err)
	}
	return resp.Team, nil
}

// ListChannels returns channels the user can see.
func (c *Client) ListChannels() ([]ChannelInfo, error) {
	params := &slack.GetConversationsParameters{
		Types:           []string{"public_channel", "private_channel"},
		ExcludeArchived: true,
		Limit:           200,
	}
	channels, _, err := c.api.GetConversations(params)
	if err != nil {
		return nil, err
	}
	var result []ChannelInfo
	for _, ch := range channels {
		result = append(result, ChannelInfo{ID: ch.ID, Name: ch.Name})
	}
	return result, nil
}

// FetchNewMessages returns messages in a channel newer than the given timestamp.
// Pass "" for oldest to get the most recent messages.
func (c *Client) FetchNewMessages(channelID, oldest string) ([]Message, error) {
	params := &slack.GetConversationHistoryParameters{
		ChannelID: channelID,
		Oldest:    oldest,
		Limit:     50,
	}
	history, err := c.api.GetConversationHistory(params)
	if err != nil {
		return nil, err
	}

	var msgs []Message
	for _, m := range history.Messages {
		// Skip bot messages, thread replies, and message subtypes (edits, deletes, etc.)
		if m.BotID != "" || m.ThreadTimestamp != "" || m.SubType != "" {
			continue
		}
		if m.Text == "" {
			continue
		}
		msgs = append(msgs, Message{
			ChannelID: channelID,
			Timestamp: m.Timestamp,
			UserID:    m.User,
			Text:      m.Text,
		})
	}
	return msgs, nil
}

// ReplyInThread posts a reply in a thread.
func (c *Client) ReplyInThread(channelID, threadTS, text string) error {
	_, _, err := c.api.PostMessage(channelID,
		slack.MsgOptionText(text, false),
		slack.MsgOptionTS(threadTS),
	)
	return err
}

// PostToChannel posts a message to a channel.
func (c *Client) PostToChannel(channelID, text string) error {
	_, _, err := c.api.PostMessage(channelID,
		slack.MsgOptionText(text, false),
	)
	return err
}

// GetUserName resolves a user ID to a display name.
func (c *Client) GetUserName(userID string) string {
	user, err := c.api.GetUserInfo(userID)
	if err != nil {
		log.Printf("get user info error: %v", err)
		return userID
	}
	if user.Profile.DisplayName != "" {
		return user.Profile.DisplayName
	}
	return user.RealName
}

// GetPermalink returns a permalink to a message.
func (c *Client) GetPermalink(channelID, messageTS string) string {
	link, err := c.api.GetPermalink(&slack.PermalinkParameters{
		Channel: channelID,
		Ts:      messageTS,
	})
	if err != nil {
		return ""
	}
	return link
}
