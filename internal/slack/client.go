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

type Client struct {
	api *slack.Client
}

// NewClientFromKeychain creates a Slack client using Claude Code's stored token.
func NewClientFromKeychain() (*Client, error) {
	token, err := ReadSlackTokenFromKeychain()
	if err != nil {
		return nil, err
	}
	return &Client{api: slack.New(token)}, nil
}

// NewClient creates a Slack client from a token directly.
func NewClient(token string) *Client {
	return &Client{api: slack.New(token)}
}

// ValidateConnection checks the token works and returns the workspace name.
func (c *Client) ValidateConnection() (string, error) {
	resp, err := c.api.AuthTest()
	if err != nil {
		return "", fmt.Errorf("slack auth failed: %w", err)
	}
	return resp.Team, nil
}

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

func (c *Client) FetchNewMessages(channelID, oldest string) ([]slack.Message, error) {
	params := &slack.GetConversationHistoryParameters{
		ChannelID: channelID,
		Oldest:    oldest,
		Limit:     50,
	}
	history, err := c.api.GetConversationHistory(params)
	if err != nil {
		return nil, err
	}
	return history.Messages, nil
}

func (c *Client) ReplyInThread(channelID, threadTS, text string) error {
	_, _, err := c.api.PostMessage(channelID,
		slack.MsgOptionText(text, false),
		slack.MsgOptionTS(threadTS),
	)
	return err
}

func (c *Client) PostToChannel(channelID, text string) error {
	_, _, err := c.api.PostMessage(channelID,
		slack.MsgOptionText(text, false),
	)
	return err
}

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
