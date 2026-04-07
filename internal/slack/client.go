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
	userID string
}

// NewClientFromKeychain creates a Slack client using Claude Code's stored token.
func NewClientFromKeychain() (*Client, error) {
	token, err := ReadSlackTokenFromKeychain()
	if err != nil {
		return nil, err
	}
	c := &Client{api: slack.New(token)}
	resp, err := c.api.AuthTest()
	if err != nil {
		return nil, fmt.Errorf("slack auth failed: %w", err)
	}
	c.userID = resp.UserID

	// For Enterprise Grid, the auth.test team_id is the enterprise ID.
	// We need the actual workspace team ID from auth.teams.list.
	if resp.EnterpriseID != "" {
		c.teamID, err = c.resolveWorkspaceTeamID()
		if err != nil {
			log.Printf("Could not resolve workspace team ID, using enterprise ID: %v", err)
			c.teamID = resp.TeamID
		}
	} else {
		c.teamID = resp.TeamID
	}
	return c, nil
}

// resolveWorkspaceTeamID gets the actual workspace team ID for Enterprise Grid.
func (c *Client) resolveWorkspaceTeamID() (string, error) {
	teams, _, err := c.api.ListTeams(slack.ListTeamsParameters{Limit: 10})
	if err != nil {
		return "", err
	}
	if len(teams) > 0 {
		return teams[0].ID, nil
	}
	return "", fmt.Errorf("no teams found")
}

// NewClient creates a Slack client from a token directly.
func NewClient(token string) *Client {
	c := &Client{api: slack.New(token)}
	resp, err := c.api.AuthTest()
	if err == nil {
		c.teamID = resp.TeamID
		c.userID = resp.UserID
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
	c.userID = resp.UserID
	return resp.Team, nil
}

func (c *Client) ListChannels() ([]ChannelInfo, error) {
	// MCP user tokens on Enterprise Grid don't have channels:read scope.
	// Try users.conversations first, fall back to empty list.
	params := &slack.GetConversationsForUserParameters{
		UserID:          c.userID,
		TeamID:          c.teamID,
		Types:           []string{"public_channel", "private_channel"},
		ExcludeArchived: true,
		Limit:           200,
	}

	var allChannels []ChannelInfo
	channels, _, err := c.api.GetConversationsForUser(params)
	if err != nil {
		log.Printf("ListChannels: API returned %v (this is normal for Enterprise Grid MCP tokens)", err)
		return nil, nil // Return empty, UI will fall back to manual input
	}
	for _, ch := range channels {
		allChannels = append(allChannels, ChannelInfo{ID: ch.ID, Name: ch.Name})
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

// ExtractMentionGroups scans recent messages in a channel for <!subteam^ID> patterns
// and returns unique group IDs with their handles.
func (c *Client) ExtractMentionGroups(channelID string) ([]MentionGroup, error) {
	msgs, err := c.FetchNewMessages(channelID, "")
	if err != nil {
		return nil, err
	}

	seen := make(map[string]bool)
	var groups []MentionGroup
	for _, msg := range msgs {
		// Find all <!subteam^XXXXX> or <!subteam^XXXXX|@handle> patterns
		text := msg.Text
		for {
			idx := indexOf(text, "<!subteam^")
			if idx == -1 {
				break
			}
			rest := text[idx+10:]
			endIdx := indexOfAny(rest, ">|")
			if endIdx == -1 {
				break
			}
			id := rest[:endIdx]
			if !seen[id] {
				seen[id] = true
				// Try to extract handle if present
				handle := ""
				if endIdx < len(rest) && rest[endIdx] == '|' {
					handleEnd := indexOf(rest[endIdx+1:], ">")
					if handleEnd != -1 {
						handle = rest[endIdx+1 : endIdx+1+handleEnd]
					}
				}
				groups = append(groups, MentionGroup{ID: id, Handle: handle})
			}
			text = rest[endIdx:]
		}
	}
	return groups, nil
}

type MentionGroup struct {
	ID     string `json:"id"`
	Handle string `json:"handle"`
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

func indexOfAny(s, chars string) int {
	for i := 0; i < len(s); i++ {
		for j := 0; j < len(chars); j++ {
			if s[i] == chars[j] {
				return i
			}
		}
	}
	return -1
}

// FormatMention formats a ping group for proper Slack rendering.
// Input can be: subteam ID (S0XXX), @handle, or <!subteam^ID>.
func FormatMention(input string) string {
	if input == "" {
		return ""
	}
	// Already formatted
	if len(input) > 10 && input[:10] == "<!subteam^" {
		return input
	}
	// Raw subteam ID
	if len(input) > 1 && input[0] == 'S' {
		return "<!subteam^" + input + ">"
	}
	// User ID
	if len(input) > 1 && input[0] == 'U' {
		return "<@" + input + ">"
	}
	// @handle -- just pass through, won't render as a mention but better than nothing
	return input
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
