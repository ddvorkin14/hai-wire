<div align="center">

# HAI-Wire

<img width="1727" height="1046" alt="Screenshot 2026-04-07 at 7 23 28 PM" src="https://github.com/user-attachments/assets/1f5ecfc4-8aeb-4402-8726-f120ed5ec4f9" />

**Hot-wire support requests to the right squad.**

[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Wails](https://img.shields.io/badge/Wails-v2-DF0000?style=flat-square)](https://wails.io)
[![Claude](https://img.shields.io/badge/Claude-AI-D97706?style=flat-square)](https://anthropic.com)

A native desktop app that monitors Slack support channels, classifies requests with Claude AI,<br/>and routes them to your squad -- with review queues, thread context, and confidence scoring.

Built for **HandshakeAI** teams. Forkable by any squad.

</div>

---

## Get Running in 60 Seconds

> **You need:** [Go 1.24+](https://go.dev/dl/) &bull; [Node.js 18+](https://nodejs.org/) &bull; [Wails v2](https://wails.io/docs/gettingstarted/installation) &bull; [Claude Code](https://claude.ai/code) with Slack connected

```bash
# 1. Grab it
git clone https://github.com/ddvorkin14/hai-wire.git && cd hai-wire

# 2. Run it
wails dev
```

**That's it.** The app opens and walks you through setup. No config files, no tokens to copy, no Slack app to create.

<details>
<summary><strong>First time? Here's what happens next...</strong></summary>

1. The app detects your Claude Code Slack connection automatically
2. You enter your [Anthropic API key](https://console.anthropic.com/) for AI classification
3. You paste your Slack channel IDs (watch + triage)
4. You name your squad and pick a ping target
5. You upload your runbook (or use default categories)
6. You pick which categories your squad owns
7. Hit Start -- messages start flowing in

Everything is configured through the UI. Complete the steps in any order.

</details>

<details>
<summary><strong>Want a production build?</strong></summary>

```bash
wails build
# Output: build/bin/hai-wire.app (macOS) or build/bin/hai-wire.exe (Windows)
```

</details>

---

## Why HAI-Wire?

Support channels are noisy. Requests meant for your squad get buried. Manual triage is slow and inconsistent.

| Before | After |
|--------|-------|
| Scroll through hundreds of messages | AI classifies every post automatically |
| Guess which team should handle it | Confidence scoring tells you how sure it is |
| Tag people manually, sometimes wrong | One-click approval routes with proper @mentions |
| No visibility into what was handled | Full history with stats and thread context |

---

## How It Works

```
   #hai-support                    HAI-Wire                        Your Squad
  ┌──────────────┐    polls    ┌───────────────┐   approved   ┌─────────────────┐
  │ New support  │ ──────────> │  Claude AI    │ ──────────>  │ #squad-triage   │
  │ request      │  every 30s  │  classifies   │              │ with confidence │
  │ posted       │             │  + scores     │              │ score + @mention│
  └──────────────┘             └───────────────┘              └─────────────────┘
                                     │
                                     v
                              ┌───────────────┐
                              │ Review Queue  │
                              │ approve/skip  │
                              └───────────────┘
```

1. **Monitors** a Slack channel by polling for new messages
2. **Classifies** each post into configurable issue categories using Claude
3. **Queues** matching posts for your review -- nothing routes without approval
4. **Routes** approved posts to your triage channel with a clickable @mention
5. **Tracks** everything -- confidence scores, routing history, thread context, stats

---

## Features

### Live Feed

<!-- TODO: Add screenshot of Live Feed -->

- **Auto-refresh** with selectable interval (5s / 10s / 30s / 1m / 5m) and countdown timer
- **Search** across author, summary, and category
- **Filter** by category, confidence level, and route status
- **Confidence reasoning** inline on every card -- explains *why* the AI scored it
- **Click any message** to open the detail panel

### Message Detail Panel

<!-- TODO: Add screenshot of detail panel -->

Click any message to slide open a detail panel with:

- **Full AI analysis** -- summary, category, confidence with reasoning
- **Thread history** -- all Slack replies loaded in real-time
- **Actions** -- send to queue, approve & route, undo route
- **Analytics** -- confidence %, reply count, category, status
- **Suggested next steps** -- context-aware guidance based on the message's status
- **"View in Slack"** link to jump to the original post

### Review Queue

Nothing gets posted to Slack without your approval.

- **Approve & Route** -- posts to triage channel with @mention
- **Skip** -- rejects without posting
- **Approve All** -- bulk approve pending items
- **Auto-Queue Rules** -- auto-queue by category + minimum confidence

### Custom Categories

Upload your own runbook and let Claude generate categories from it.

- Upload a `.txt` or `.md` file, or paste text directly
- Claude extracts categories with keys, names, and descriptions
- Review and select which ones to keep
- Reset to built-in defaults anytime

### Settings

Everything is configurable through the UI.

| Setting | Description |
|---------|-------------|
| **Slack Connection** | Auto-connects via Claude Code keychain, auto-refreshes tokens |
| **Claude API Key** | For AI classification |
| **Watch Channel** | Source channel to monitor (with connection test) |
| **Triage Channel** | Destination for routed requests (with send test) |
| **Squad Name** | Your team's name |
| **Ping Target** | Searchable dropdown of 1000+ workspace users and groups |
| **Confidence Threshold** | Slider (10-100%) |
| **Ack Reply** | Toggle thread replies on/off (off by default) |
| **Owned Categories** | Checkboxes for which categories your squad handles |

---

## Slack Connection

HAI-Wire uses your **Claude Code Slack MCP connection**. No bot tokens, no OAuth apps, no admin access needed.

1. Connect Slack in Claude Code (`/mcp`)
2. HAI-Wire reads the token from your macOS keychain automatically
3. Token auto-refreshes when Claude Code renews it

> **Channel IDs:** Enter channel IDs manually (click channel name in Slack, scroll to bottom, copy ID). Enterprise Grid doesn't support channel listing via this token type.

---

## Triage Message Format

When a request is approved, this gets posted to your triage channel:

```
🟢 [Confidence: 92%] Onboarding Blockers

Summary: Fellow stuck on 'Setting up your profile' loading screen
after KYC verification.

Original post: https://slack.com/archives/C08MXC8URS8/p1775514637600389
Posted by: Jane Doe

@hai-conversion-on-call
```

Mentions use proper Slack formatting (`<@USER_ID>` / `<!subteam^GROUP_ID>`) so they're clickable and actually ping people.

---

## Fork It For Your Squad

Each squad runs their own instance. Clone, run, configure through the UI.

```bash
git clone https://github.com/ddvorkin14/hai-wire.git && cd hai-wire && wails dev
```

**No code changes required.** Everything is configured through the UI.

| Setting | hai-conversion | trust-safety |
|---------|---------------|-------------|
| Watch Channel | C08MXC8URS8 | C08MXC8URS8 |
| Triage Channel | CXXXXXXXXXX | CYYYYYYYYYY |
| Ping Target | @hai-conversion-on-call | @tns-hai-only |
| Categories | Onboarding Blockers | Trust & Safety, Fraud |
| Threshold | 77% | 60% |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Wails v2 App                      │
│                                                      │
│  ┌──────────────────┐    ┌────────────────────────┐  │
│  │   Go Backend     │    │   React Frontend       │  │
│  │                  │    │                        │  │
│  │  Slack Client    │    │  Live Feed             │  │
│  │  (keychain auth) │◄──►│  (auto-refresh)        │  │
│  │                  │    │                        │  │
│  │  Claude AI       │    │  Message Detail Panel  │  │
│  │  (classifier)    │◄──►│  (thread + analytics)  │  │
│  │                  │    │                        │  │
│  │  SQLite DB       │    │  Review Queue          │  │
│  │  (local storage) │◄──►│  (approve/skip)        │  │
│  │                  │    │                        │  │
│  │  Config Service  │◄──►│  Settings + Setup      │  │
│  │                  │    │                        │  │
│  └──────────────────┘    └────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop | [Wails v2](https://wails.io) | Native binary, no Electron |
| Backend | Go | Fast, great Slack libraries |
| Frontend | React + TypeScript + Tailwind | Rapid iteration |
| AI | Claude API via Anthropic Go SDK | Best classification accuracy |
| Slack | Raw HTTP + slack-go | Enterprise Grid compatible |
| Storage | SQLite | Zero-config local persistence |
| Auth | macOS Keychain | Reads Claude Code's Slack token |

---

## Development

```bash
wails dev                        # Dev mode with hot reload
go test ./internal/... -v        # Run all tests
wails build                      # Production binary
wails generate module            # Regenerate Go<->TS bindings
cd frontend && npm run dev       # Frontend only
```

<details>
<summary><strong>Project structure</strong></summary>

```
hai-wire/
├── app.go                          # Wails bindings (Go <-> React)
├── main.go                         # Entry point
├── internal/
│   ├── db/                         # SQLite: schema, migrations, CRUD
│   ├── config/                     # Config service
│   ├── classifier/                 # Claude AI + category extraction
│   ├── slack/                      # Slack client, keychain, user search
│   └── triage/                     # Routing helpers
├── frontend/src/
│   ├── App.tsx                     # Shell + navigation
│   └── components/
│       ├── feed/                   # LiveFeed, MessageCard, MessageDetail
│       ├── queue/                  # ReviewQueue
│       ├── settings/               # Settings, PingTargetPicker
│       ├── wizard/                 # Setup Dashboard (7 steps)
│       ├── log/                    # Activity Log
│       └── shared/                 # ConfidenceBadge
└── docs/superpowers/               # Design spec + implementation plan
```

</details>

<details>
<summary><strong>Data model</strong></summary>

```sql
config (key TEXT PK, value TEXT)
owned_categories (category_key TEXT UNIQUE, category_name TEXT)
custom_categories (key TEXT UNIQUE, name TEXT, description TEXT)
processed_messages (
  message_ts TEXT UNIQUE, category TEXT, confidence REAL,
  summary TEXT, reasoning TEXT, status TEXT, routed BOOLEAN
)
auto_approval_rules (category_key TEXT, min_confidence REAL, enabled BOOLEAN)
```

</details>

---

## Roadmap

- [ ] Cloud deployment via Claude Agent SDK (always-on)
- [ ] Multi-squad mode (single instance, multiple squads)
- [ ] Accuracy feedback loop (thumbs up/down)
- [ ] Notion integration for runbook entries
- [ ] Analytics dashboard with trends
- [ ] Batch re-classify with updated categories
- [ ] Custom triage message templates

---

<div align="center">

Built with Claude AI by the HandshakeAI team

[Report Bug](https://github.com/ddvorkin14/hai-wire/issues) &bull; [Request Feature](https://github.com/ddvorkin14/hai-wire/issues)

</div>
