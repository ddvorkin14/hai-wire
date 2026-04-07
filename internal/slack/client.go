package slack

import (
	"context"
	"fmt"
	"log"

	"github.com/slack-go/slack"
	"github.com/slack-go/slack/slackevents"
	"github.com/slack-go/slack/socketmode"
)

type MessageHandler func(channelID, messageTS, userID, text string)

type Client struct {
	api       *slack.Client
	socket    *socketmode.Client
	onMessage MessageHandler
}

func NewClient(botToken, appToken string) *Client {
	api := slack.New(botToken, slack.OptionAppLevelToken(appToken))
	socket := socketmode.New(api)
	return &Client{api: api, socket: socket}
}

func ValidateTokens(botToken, appToken string) (string, error) {
	api := slack.New(botToken, slack.OptionAppLevelToken(appToken))
	resp, err := api.AuthTest()
	if err != nil {
		return "", fmt.Errorf("invalid tokens: %w", err)
	}
	return resp.Team, nil
}

type ChannelInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
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

func (c *Client) SetMessageHandler(handler MessageHandler) {
	c.onMessage = handler
}

func (c *Client) Listen(ctx context.Context, watchChannelID string) error {
	go func() {
		for evt := range c.socket.Events {
			switch evt.Type {
			case socketmode.EventTypeEventsAPI:
				eventsAPIEvent, ok := evt.Data.(slackevents.EventsAPIEvent)
				if !ok {
					continue
				}
				c.socket.Ack(*evt.Request)

				if eventsAPIEvent.Type == slackevents.CallbackEvent {
					switch innerEvent := eventsAPIEvent.InnerEvent.Data.(type) {
					case *slackevents.MessageEvent:
						if innerEvent.BotID != "" || innerEvent.ThreadTimeStamp != "" || innerEvent.Channel != watchChannelID {
							continue
						}
						if innerEvent.SubType != "" {
							continue
						}
						if c.onMessage != nil {
							c.onMessage(innerEvent.Channel, innerEvent.TimeStamp, innerEvent.User, innerEvent.Text)
						}
					}
				}
			}
		}
	}()

	return c.socket.RunContext(ctx)
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
