# HAI-Wire

**Hot-wire support requests to the right squad.**

HAI-Wire is a desktop app that monitors the `#hai-support` Slack channel, classifies incoming support requests using Claude, and routes relevant ones to your squad's triage channel with confidence scoring. Built for HandshakeAI teams -- any squad can fork this repo, run the app, and configure it for their domain through a guided setup wizard.

<!-- Screenshot: App overview showing the Live Feed with classified messages -->
<!-- TODO: Add screenshot of the main Live Feed view here -->
<!-- Recommended size: 1200x800, PNG format -->

---

## How It Works

1. **Watches** a Slack channel for new support posts (via Socket Mode)
2. **Classifies** each post into one of 27 known issue categories using Claude
3. **Routes** matching posts to your squad's triage channel with a confidence score
4. **Replies** in-thread on the original post confirming the request has been analyzed

```
New message in #hai-support
        |
        v
   Claude classifies it
        |
        v
  "onboarding_blocker" (92% confidence)
        |
   +----+----+
   |         |
   v         v
Thread    Triage channel
reply     with details +
          @squad-on-call
```

---

## Quick Start

### Prerequisites

- [Go 1.24+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails v2](https://wails.io/docs/gettingstarted/installation)
- A Slack app with Socket Mode enabled (see [Slack Setup](#slack-app-setup))
- An [Anthropic API key](https://console.anthropic.com/)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/ddvorkin14/hai-wire.git
cd hai-wire

# Run in dev mode
wails dev

# Or build a production binary
wails build
```

The app opens and walks you through the setup wizard on first launch.

---

## Setup Wizard

The wizard runs on first launch and walks through 7 steps. No config files to edit -- everything is configured through the UI.

### Step 1: Connect Slack

Enter your Slack Bot Token (`xoxb-...`) and App Token (`xapp-...`). The app validates the connection and shows your workspace name.

<!-- Screenshot: Step 1 - Slack connection with workspace name confirmed -->
<!-- TODO: Add screenshot here -->

### Step 2: Connect Claude

Enter your Anthropic API key (`sk-ant-...`).

### Step 3: Pick Watch Channel

Select the Slack channel to monitor from a dropdown. Use a test channel like `#test-hai-support` to start.

<!-- Screenshot: Step 3 - Channel dropdown -->
<!-- TODO: Add screenshot here -->

### Step 4: Set Up Your Squad

- **Squad Name** -- e.g., `hai-conversion`
- **Ping Group** -- the Slack handle to notify, e.g., `@hai-conversion-on-call`
- **Triage Channel** -- where routed messages go, e.g., `#hai-conv-support-triage`

### Step 5: Choose Categories

Check the issue types your squad owns from the list of 27 categories. For example, `hai-conversion` owns "Onboarding Blockers."

<!-- Screenshot: Step 5 - Category checklist with some items selected -->
<!-- TODO: Add screenshot here -->

### Step 6: Confidence Threshold

Set how confident the classifier needs to be before routing to your triage channel. Default is 50%.

- **80-100%** -- High confidence, almost certainly your squad
- **50-79%** -- Medium, likely but not certain
- **Below 50%** -- Low, will include more false positives

### Step 7: Review & Start

Review all settings and hit "Start Monitoring."

<!-- Screenshot: Step 7 - Review screen showing all configured settings -->
<!-- TODO: Add screenshot here -->

---

## App Views

### Live Feed

Real-time display of classified messages from the watched channel. Each message shows:
- Author and timestamp
- Detected category
- Confidence badge (color-coded green/yellow/red)
- Claude-generated summary
- "Routed" indicator if sent to triage

<!-- Screenshot: Live Feed with several classified messages showing different confidence levels -->
<!-- TODO: Add screenshot here -->

### Settings

All wizard settings, editable at any time. Changes take effect immediately.

<!-- Screenshot: Settings panel -->
<!-- TODO: Add screenshot here -->

### Activity Log

Historical view of all processed messages with stats:
- Messages processed
- Messages routed
- Average confidence

<!-- Screenshot: Activity Log with stats and table -->
<!-- TODO: Add screenshot here -->

---

## What Gets Posted

### Thread Reply (on the original message)

> This support request has been analyzed and the appropriate team has been notified.

### Triage Channel Post

```
🟢 [Confidence: 92%] Onboarding Blockers

Summary: Fellow stuck on 'Setting up your profile' loading screen
after KYC verification.

Original post: <link>
Posted by: Jane Doe

@hai-conversion-on-call
```

---

## Slack App Setup

Your Slack app needs the following configuration:

### Required Scopes (Bot Token)

| Scope | Purpose |
|-------|---------|
| `channels:history` | Read messages in public channels |
| `channels:read` | List channels for the config UI |
| `chat:write` | Post thread replies and triage messages |
| `users:read` | Resolve user display names |

### Socket Mode

1. Go to your app settings > **Socket Mode** > Enable
2. Generate an **App-Level Token** with `connections:write` scope
3. Go to **Event Subscriptions** > Subscribe to `message.channels`

---

## Forking for Your Squad

1. Clone the repo
2. Run `wails dev` or `wails build`
3. Launch the app -- the wizard walks through all configuration
4. Select the categories your squad owns
5. Start monitoring

**No code changes required.** Everything is configured through the UI. Each squad runs their own instance.

---

## Architecture

```
Go Backend                          React Frontend
+------------------+               +------------------+
| Slack Client     |               | Setup Wizard     |
| (Socket Mode)    |               | (7 steps)        |
+------------------+               +------------------+
| Claude Classifier|               | Live Feed        |
| (Anthropic API)  |               | (real-time)      |
+------------------+               +------------------+
| Triage           |  <-- Wails -> | Settings         |
| Orchestrator     |    Bindings   | (editable)       |
+------------------+               +------------------+
| Config Service   |               | Activity Log     |
+------------------+               | (history + stats)|
| SQLite DB        |               +------------------+
+------------------+
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop framework | Wails v2 |
| Backend | Go |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Slack integration | slack-go (Socket Mode) |
| LLM classification | Claude API (Anthropic Go SDK) |
| Local storage | SQLite |

---

## Support Categories

HAI-Wire classifies messages into 27 categories derived from real `#hai-support` traffic:

| Category | Description |
|----------|-------------|
| Trust & Safety | Suspicious accounts, follow-on review, KYC issues |
| Pay Disputes | Pay amount disputes, hour mismatches |
| Verification Swaps | EDU vs non-EDU account swaps |
| Slack Access | Missing Slack invites, channel access |
| Duplicate Accounts | Account merges, deprecated accounts |
| Verified But Blocked | "Under review" despite verification |
| Pay Rate Corrections | Wrong rate applied |
| Project Re-allocation | Moving fellows between accounts/projects |
| Google Access | Google Docs/Groups invite issues |
| Project Not Visible | Dashboard visibility issues |
| Onboarding Blockers | Stuck on setup, loading screens |
| Incentive Disputes | Missing bonuses |
| Geographic Restrictions | Geofencing, non-US access |
| Platform Bugs | UI issues, broken features |
| Ban Appeals | Ban/unban conflicts |
| Account Deletion | Deletion process issues |
| Fraud / Scam | Hacked accounts, phishing |
| Feather Access | Feather platform access |
| Tax Forms | 1099, 1042-S, W9 issues |
| Assessment Issues | Assessment errors, retakes |
| Playbook Access | Can't access project playbook |
| Tasking Issues | No tasks, wrong tasks |
| Onboarding Emails | Broken invitation links |
| Project Lead Delays | Approval wait times |
| Work Letters | Employment verification |
| Hour Adjustments | Accidental time entries |
| Git Access | GitHub/Git issues (Helix) |

---

## Development

```bash
# Run in dev mode (hot reload)
wails dev

# Run Go tests
go test ./internal/... -v

# Build production binary
wails build

# Frontend only (for UI development)
cd frontend && npm run dev
```

### Project Structure

```
hai-wire/
  app.go                    # Wails app bindings
  main.go                   # Entry point
  internal/
    db/                     # SQLite persistence
    config/                 # Config service
    classifier/             # Claude API + categories
    slack/                  # Slack Socket Mode client
    triage/                 # Orchestrator (classify + route)
  frontend/
    src/
      components/
        wizard/             # 7-step setup wizard
        feed/               # Live feed view
        settings/           # Settings panel
        log/                # Activity log
        shared/             # Shared components
```

---

## Future Ideas

- Cloud deployment via Claude Agent SDK (always-on, no local machine)
- Multi-squad mode (single instance routing to multiple squads)
- Accuracy feedback loop (thumbs up/down on classifications)
- Notion integration for auto-creating runbook entries
- Analytics dashboard with classification trends

---

## License

Internal tool -- HandshakeAI
