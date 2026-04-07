<div align="center">

# HAI-Wire
<img width="1727" height="1046" alt="Screenshot 2026-04-07 at 7 23 28 PM" src="https://github.com/user-attachments/assets/1f5ecfc4-8aeb-4402-8726-f120ed5ec4f9" />

**Hot-wire support requests to the right squad.**

[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Wails](https://img.shields.io/badge/Wails-v2-DF0000?style=flat-square)](https://wails.io)
[![Claude](https://img.shields.io/badge/Claude-AI-D97706?style=flat-square)](https://anthropic.com)

A native desktop app that monitors Slack support channels, classifies requests with Claude AI, and routes them to your squad's triage channel -- with confidence scoring, review queues, and auto-approval rules.

Built for **HandshakeAI** teams. Forkable by any squad.

<!-- TODO: Add hero screenshot of the Live Feed view (1200x800 PNG) -->
<!-- ![HAI-Wire Live Feed](docs/screenshots/hero.png) -->

</div>

---

## Why HAI-Wire?

Support channels are noisy. Requests meant for your squad get buried. Manual triage is slow and inconsistent. HAI-Wire fixes this by:

- **Classifying every post** with Claude AI into specific issue categories
- **Routing only what's yours** to your squad's triage channel with confidence scores
- **Queueing for review** so nothing gets auto-posted without approval
- **Working locally** -- no servers, no infrastructure, runs on your machine

---

## How It Works

```
   #hai-support                    HAI-Wire                        Your Squad
  ┌─────────────┐    polls     ┌──────────────┐    routes     ┌────────────────┐
  │ New support  │ ──────────> │  Claude AI    │ ──────────> │ #squad-triage   │
  │ request      │  every 30s  │  classifies   │  if approved │ with confidence │
  │ posted       │             │  + scores     │              │ score + summary │
  └─────────────┘             └──────────────┘              └────────────────┘
                                     │
                                     v
                              ┌──────────────┐
                              │ Review Queue  │
                              │ approve/skip  │
                              └──────────────┘
```

1. **Monitors** a Slack channel by polling for new messages
2. **Classifies** each post into configurable issue categories using Claude
3. **Queues** matching posts for your review (or auto-approves based on rules)
4. **Routes** approved posts to your triage channel with a clickable @mention
5. **Tracks** everything -- confidence scores, routing history, stats

---

## Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| [Go](https://go.dev/dl/) | 1.24+ | Backend |
| [Node.js](https://nodejs.org/) | 18+ | Frontend build |
| [Wails](https://wails.io/docs/gettingstarted/installation) | v2 | Desktop framework |
| [Claude Code](https://claude.ai/code) | Latest | Slack MCP connection |
| [Anthropic API Key](https://console.anthropic.com/) | -- | AI classification |

### Install & Run

```bash
git clone https://github.com/ddvorkin14/hai-wire.git
cd hai-wire
wails dev
```

That's it. The app opens and guides you through setup.

> **Slack connection:** HAI-Wire uses your Claude Code Slack MCP connection -- no bot tokens or OAuth setup needed. Just make sure you've connected Slack in Claude Code first (`/mcp`).

### Build for Distribution

```bash
wails build
# Binary output: build/bin/hai-wire (macOS) or build/bin/hai-wire.exe (Windows)
```

---

## Features

### Live Feed

Real-time classified message feed with search, filters, and auto-refresh.

<!-- TODO: Add screenshot of Live Feed (1200x800 PNG) -->
<!-- ![Live Feed](docs/screenshots/live-feed.png) -->

- **Auto-refresh** with configurable interval (5s / 10s / 30s / 1m / 5m)
- **Countdown timer** shows time until next refresh
- **Search** across author, summary, and category
- **Filter** by category, confidence level (high/medium/low), and route status
- **Confidence reasoning** shown inline on every card -- explains *why* the AI scored it that way
- **Manual routing** -- send any message to the review queue with one click
- **Undo routing** -- revert a routed message back to unrouted
- **Stats bar** -- scanned, routed, high/medium/low confidence at a glance

### Review Queue

Nothing gets posted to Slack without your approval (unless you set up auto-approval rules).

<!-- TODO: Add screenshot of Review Queue (1200x800 PNG) -->
<!-- ![Review Queue](docs/screenshots/review-queue.png) -->

- **Approve & Route** -- posts to triage channel with @mention
- **Skip** -- rejects without posting
- **Approve All** -- bulk approve pending items
- **Auto-Approval Rules** -- set rules by category + minimum confidence (e.g., "auto-approve onboarding_blocker at 90%+")

### Custom Categories via Document Upload

Don't want the built-in categories? Upload your own runbook and let Claude generate categories from it.

<!-- TODO: Add screenshot of Runbook upload step (1200x800 PNG) -->
<!-- ![Runbook Upload](docs/screenshots/runbook.png) -->

- Upload a `.txt` or `.md` file, or paste text directly
- Claude extracts categories with keys, names, and descriptions
- Review and select which categories to keep
- Reset to defaults anytime

### Settings

Everything is configurable through the UI. No config files.

<!-- TODO: Add screenshot of Settings page (1200x800 PNG) -->
<!-- ![Settings](docs/screenshots/settings.png) -->

| Setting | Description |
|---------|-------------|
| **Slack Connection** | Auto-connects via Claude Code keychain |
| **Claude API Key** | For AI classification |
| **Watch Channel** | Source channel to monitor |
| **Triage Channel** | Destination for routed requests |
| **Squad Name** | Your team's name |
| **Ping Target** | Searchable dropdown of all workspace users and groups |
| **Confidence Threshold** | Slider (10-100%) with visual guide |
| **Ack Reply** | Toggle thread replies on/off (off by default) |
| **Owned Categories** | Checkboxes for which categories your squad handles |
| **Test Buttons** | Verify channel connections without sending messages |

### Setup Dashboard

Non-linear setup -- complete steps in any order. Perfect when some steps need external approvals.

<!-- TODO: Add screenshot of Setup Dashboard (1200x800 PNG) -->
<!-- ![Setup](docs/screenshots/setup.png) -->

- 7 setup cards: Slack, Claude API, Watch Channel, Squad, Runbook, Categories, Confidence
- Each card shows Done/Todo status
- Progress bar at the top
- Setup banner appears in main app if incomplete

---

## Slack Connection

HAI-Wire connects to Slack through **Claude Code's MCP integration** -- the same connection you use in your terminal. No bot tokens, no OAuth apps, no admin access needed.

### How it works

1. Connect Slack in Claude Code by running `/mcp`
2. HAI-Wire reads the stored token from your macOS keychain
3. Messages are read and posted using Slack's API with that token

### What it can do

| Action | Works? | Notes |
|--------|--------|-------|
| Read channel messages | Yes | `channels:history` scope |
| Post messages | Yes | `chat:write` scope |
| Look up user names | Yes | `users:read` scope |
| List all workspace users | Yes | Paginated via raw HTTP |
| List channels | No | Enterprise Grid limitation |
| List user groups | No | Missing `usergroups:read` scope |

> **Channel IDs:** Since channel listing doesn't work on Enterprise Grid, you enter channel IDs manually. Find a channel ID by clicking the channel name in Slack and scrolling to the bottom of the info panel.

---

## Triage Message Format

When a request is approved and routed, this is what gets posted to your triage channel:

```
🟢 [Confidence: 92%] Onboarding Blockers

Summary: Fellow stuck on 'Setting up your profile' loading screen
after KYC verification.

Original post: https://slack.com/archives/C08MXC8URS8/p1775514637600389
Posted by: Jane Doe

@hai-conversion-on-call
```

- Confidence badge: 🟢 High (80%+) | 🟡 Medium (50-79%) | 🔴 Low (<50%)
- Clickable link to the original post
- Proper Slack @mention (not plain text) -- uses `<@USER_ID>` or `<!subteam^GROUP_ID>` format

---

## For Other Squads

HAI-Wire is designed to be forked. Each squad runs their own instance with their own config.

```bash
# 1. Clone
git clone https://github.com/ddvorkin14/hai-wire.git
cd hai-wire

# 2. Run
wails dev

# 3. Configure through the UI
#    - Connect Slack (automatic via Claude Code)
#    - Set your squad name, ping target, channels
#    - Upload your runbook OR pick from default categories
#    - Set confidence threshold
#    - Start monitoring
```

**No code changes required.** Everything is configured through the UI.

### What each squad customizes

| Setting | Example (hai-conversion) | Example (trust-safety) |
|---------|------------------------|----------------------|
| Squad Name | hai-conversion | trust-safety |
| Watch Channel | C08MXC8URS8 | C08MXC8URS8 |
| Triage Channel | CXXXXXXXXXX | CYYYYYYYYYY |
| Ping Target | @hai-conversion-on-call | @tns-hai-only |
| Categories | Onboarding Blockers | Trust & Safety, Fraud |
| Threshold | 77% | 60% |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Wails v2 App                      │
│                                                      │
│  ┌──────────────────┐    ┌────────────────────────┐  │
│  │   Go Backend     │    │   React Frontend       │  │
│  │                  │    │                        │  │
│  │  ┌────────────┐  │    │  ┌──────────────────┐  │  │
│  │  │ Slack      │  │    │  │ Live Feed        │  │  │
│  │  │ Client     │◄─┼────┼──│ (auto-refresh)   │  │  │
│  │  │ (keychain) │  │    │  └──────────────────┘  │  │
│  │  └────────────┘  │    │  ┌──────────────────┐  │  │
│  │  ┌────────────┐  │    │  │ Review Queue     │  │  │
│  │  │ Claude     │  │    │  │ (approve/skip)   │  │  │
│  │  │ Classifier │◄─┼────┼──└──────────────────┘  │  │
│  │  └────────────┘  │    │  ┌──────────────────┐  │  │
│  │  ┌────────────┐  │    │  │ Settings         │  │  │
│  │  │ SQLite DB  │  │    │  │ (all config)     │  │  │
│  │  │ (local)    │◄─┼────┼──└──────────────────┘  │  │
│  │  └────────────┘  │    │  ┌──────────────────┐  │  │
│  │  ┌────────────┐  │    │  │ Setup Dashboard  │  │  │
│  │  │ Config     │  │    │  │ (non-linear)     │  │  │
│  │  │ Service    │◄─┼────┼──└──────────────────┘  │  │
│  │  └────────────┘  │    │                        │  │
│  └──────────────────┘    └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop | [Wails v2](https://wails.io) | Native app, single binary, no Electron bloat |
| Backend | Go | Fast, simple, great Slack/HTTP libraries |
| Frontend | React + TypeScript | Component model, type safety |
| Styling | Tailwind CSS | Rapid UI iteration |
| AI | Claude API (Anthropic Go SDK) | Best classification accuracy |
| Slack | Raw HTTP + slack-go | Enterprise Grid compatible |
| Storage | SQLite | Zero-config local persistence |
| Auth | macOS Keychain | Reads Claude Code's Slack MCP token |

---

## Development

```bash
# Dev mode with hot reload
wails dev

# Run all tests
go test ./internal/... -v

# Build production binary
wails build

# Frontend only (for UI work)
cd frontend && npm run dev

# Generate Wails bindings after changing Go methods
wails generate module
```

### Project Structure

```
hai-wire/
├── app.go                          # Wails bindings (Go <-> React bridge)
├── main.go                         # Entry point
├── internal/
│   ├── db/                         # SQLite: schema, migrations, CRUD
│   │   ├── db.go
│   │   └── db_test.go
│   ├── config/                     # Config service (get/set from SQLite)
│   │   ├── config.go
│   │   └── config_test.go
│   ├── classifier/                 # Claude AI classification
│   │   ├── classifier.go           # API calls, prompt building
│   │   ├── classifier_test.go
│   │   ├── categories.go           # 27 default categories
│   │   └── extract.go              # Extract categories from documents
│   ├── slack/                      # Slack integration
│   │   ├── client.go               # API client, user search, mentions
│   │   ├── client_test.go
│   │   └── keychain.go             # Read token from macOS keychain
│   └── triage/                     # Routing helpers
│       ├── triage.go
│       └── triage_test.go
├── frontend/
│   └── src/
│       ├── App.tsx                  # Main app shell + nav
│       ├── types.ts                 # Shared TypeScript types
│       └── components/
│           ├── feed/                # Live Feed + MessageCard
│           ├── queue/               # Review Queue
│           ├── settings/            # Settings + PingTargetPicker
│           ├── wizard/              # Setup Dashboard (7 steps)
│           ├── log/                 # Activity Log
│           └── shared/              # ConfidenceBadge, etc.
└── docs/
    └── superpowers/
        ├── specs/                   # Design spec
        └── plans/                   # Implementation plan
```

### Data Model

```sql
-- Config (key-value store)
config (key TEXT PK, value TEXT)

-- Categories your squad owns
owned_categories (category_key TEXT UNIQUE, category_name TEXT)

-- Custom categories from document upload
custom_categories (key TEXT UNIQUE, name TEXT, description TEXT)

-- Every classified message
processed_messages (
  message_ts TEXT UNIQUE,  -- Slack timestamp (dedup key)
  category TEXT,           -- Classified category
  confidence REAL,         -- 0.0 - 1.0
  summary TEXT,            -- AI-generated summary
  reasoning TEXT,          -- Why this category/confidence
  status TEXT,             -- classified | pending | approved | rejected
  routed BOOLEAN           -- Whether it was posted to triage
)

-- Auto-approval rules
auto_approval_rules (
  category_key TEXT,       -- NULL = all categories
  min_confidence REAL,     -- Minimum confidence to auto-approve
  enabled BOOLEAN
)
```

---

## Roadmap

- [ ] Cloud deployment via Claude Agent SDK (always-on, no local machine)
- [ ] Multi-squad mode (single instance routing to multiple squads)
- [ ] Accuracy feedback loop (thumbs up/down on classifications)
- [ ] Notion integration for auto-creating runbook entries
- [ ] Analytics dashboard with classification trends
- [ ] Custom ack reply message templates
- [ ] Slack thread context (read replies before classifying)
- [ ] Batch re-classify with updated categories

---

## Contributing

This is an internal HandshakeAI tool. To contribute:

1. Fork the repo
2. Create a feature branch
3. Make your changes with tests
4. Open a PR

---

<div align="center">

Built with Claude AI by the HandshakeAI team

[Report Bug](https://github.com/ddvorkin14/hai-wire/issues) | [Request Feature](https://github.com/ddvorkin14/hai-wire/issues)

</div>
