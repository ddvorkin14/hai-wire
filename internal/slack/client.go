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
	api    *slack.Client
	teamID string
}

// NewClientFromKeychain creates a Slack client using Claude Code's stored token.
func NewClientFromKeychain() (*Client, error) {
	token, err := ReadSlackTokenFromKeychain()
	if err != nil {
		return nil, err
	}
	c := &Client{api: slack.New(token)}
	// Get team ID (required for user tokens)
	resp, err := c.api.AuthTest()
	if err != nil {
		return nil, fmt.Errorf("slack auth failed: %w", err)
	}
	c.teamID = resp.TeamID
	return c, nil
}

// NewClient creates a Slack client from a token directly.
func NewClient(token string) *Client {
	c := &Client{api: slack.New(token)}
	resp, err := c.api.AuthTest()
	if err == nil {
		c.teamID = resp.TeamID
	}
	return c
}

// ValidateConnection checks the token works and returns the workspace name.
func (c *Client) ValidateConnection() (string, error) {
	resp, err := c.api.AuthTest()
	if err != nil {
		return "", fmt.Errorf("slack auth failed: %w", err)
	}
	c.teamID = resp.TeamID
	return resp.Team, nil
}

func (c *Client) ListChannels() ([]ChannelInfo, error) {
	var allChannels []ChannelInfo
	params := &slack.GetConversationsParameters{
		Types:           []string{"public_channel", "private_channel"},
		ExcludeArchived: true,
		TeamID:          c.teamID,
		Limit:           200,
	}

	for {
		channels, cursor, err := c.api.GetConversations(params)
		if err != nil {
			return nil, err
		}
		for _, ch := range channels {
			allChannels = append(allChannels, ChannelInfo{ID: ch.ID, Name: ch.Name})
		}
		if cursor == "" {
			break
		}
		params.Cursor = cursor
	}

	return allChannels, nil
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
