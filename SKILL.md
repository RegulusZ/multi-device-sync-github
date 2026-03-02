---
name: multi-device-sync-github
description: Multi-device OpenClaw data synchronization using GitHub. Cross-platform (Linux, macOS, Windows). Manages workspace data sync across multiple machines with automatic push on file changes, periodic pull, and conflict detection. Use when setting up or managing OpenClaw across multiple devices.
---

# Multi-Device Sync via GitHub

Cross-platform synchronization of OpenClaw workspace data using a private GitHub repository.

## Features

- **Cross-platform**: Linux, macOS, Windows
- **Automatic push**: File changes trigger git commit + push (configurable)
- **Periodic pull**: Configurable interval to pull remote changes
- **Conflict detection**: Interactive conflict resolution
- **Multi-device**: Each device uses distinct prefixes for memory files
- **Symlink architecture**: Seamless integration with workspace

## Supported Platforms

| Platform | Service Manager | File Watcher |
|----------|----------------|--------------|
| Linux | systemd | chokidar |
| macOS | launchd | chokidar |
| Windows | Task Scheduler | chokidar |

## Prerequisites

- Node.js 18+
- Git
- GitHub account with private repository

## Installation

```bash
npx clawhub install multi-device-sync-github
```

Or via npm:

```bash
npm install multi-device-sync-github
```

## Quick Start

### Interactive Setup

```bash
npx openclaw-sync setup
```

The setup wizard will guide you through:
1. Enter your GitHub sync repo URL
2. Name your device
3. Configure auto-push and sync interval

### Manual Sync

```bash
npx openclaw-sync sync
```

### Check Status

```bash
npx openclaw-sync status
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `setup` | Interactive setup wizard |
| `sync` | Immediate sync (pull + push) |
| `status` | Show sync status |
| `resolve` | Resolve conflicts interactively |
| `start` | Start background sync service |
| `stop` | Stop background sync service |
| `add-device` | Add a new device to sync network |

## Configuration

Configuration file: `~/.config/openclaw/sync-config.yaml` (Linux/macOS) or `%APPDATA%\openclaw\sync-config.yaml` (Windows)

```yaml
repo_url: "git@github.com:username/openclaw-sync.git"
device_name: "ubuntu"
sync_interval_minutes: 5
auto_pull_on_start: true
auto_push_enabled: false

paths:
  sync:
    - "USER.md"
    - "MEMORY.md"
    - "SOUL.md"
    - "skills/"
    - "memory/"
```

## OpenClaw Skill API

This skill can be invoked directly by OpenClaw:

```javascript
// Setup sync
await setup({
  repoUrl: "git@github.com:username/openclaw-sync.git",
  deviceName: "ubuntu"
});

// Immediate sync
await sync_now();

// Check status
await check_status();

// Resolve conflicts
await resolve_conflicts();

// Start/stop background sync
await start_sync();
await stop_sync();
```

## Architecture

```
Device A (Ubuntu) ◄────► GitHub Repo ◄────► Device B (Mac)
       │                      │                    │
   auto-push              central              auto-push
  periodic pull             hub               periodic pull
       │                      │                    │
   symlinks                  │                 symlinks
       ▼                      │                    ▼
~/.openclaw/workspace         │            ~/.openclaw/workspace
```

### Symlink Architecture

```
~/.openclaw/workspace/
├── USER.md      → ~/openclaw-sync/USER.md (symlink)
├── MEMORY.md    → ~/openclaw-sync/MEMORY.md (symlink)
├── SOUL.md      → ~/openclaw-sync/SOUL.md (symlink)
├── skills/      → ~/openclaw-sync/skills/ (symlink)
└── memory/      → ~/openclaw-sync/memory/ (symlink)
```

## Conflict Resolution

When conflicts occur during pull:

1. Sync pauses automatically
2. Run `npx openclaw-sync resolve`
3. Choose for each conflicted file:
   - Keep local (ours)
   - Keep remote (theirs)
   - Open in editor (manual)
   - Abort sync

## Adding New Device

### Option A: Interactive

```bash
npx openclaw-sync add-device
```

### Option B: Manual

```bash
npx openclaw-sync setup --repo-url git@github.com:user/sync.git --device-name laptop
npx openclaw-sync start
```

## File Naming Convention

Memory files use device prefix to avoid conflicts:

```
memory/
├── ubuntu-2026-03-02.md      # Ubuntu device
├── macmini-2026-03-02.md     # Mac Mini device
└── laptop-2026-03-02.md      # Laptop device
```

## Security

- **Use a private GitHub repository** to protect personal data
- Sensitive files may include:
  - `MEMORY.md` - May contain IP addresses, service URLs
  - `memory/` - Daily logs with potentially sensitive details
- **Never commit API keys or passwords**

## Files in This Skill

```
multi-device-sync-github/
├── index.js              # OpenClaw skill API
├── cli.js                # Command-line interface
├── package.json          # npm dependencies
├── SKILL.md              # This file
├── README.md             # GitHub README
├── src/
│   ├── core/
│   │   ├── sync-manager.js     # Core sync logic
│   │   ├── git-ops.js          # Git operations
│   │   ├── file-watcher.js     # File monitoring
│   │   └── conflict-resolver.js # Conflict handling
│   ├── platforms/
│   │   ├── base.js             # Platform abstraction
│   │   ├── linux.js            # Linux (systemd)
│   │   ├── macos.js            # macOS (launchd)
│   │   └── windows.js          # Windows (Task Scheduler)
│   └── utils/
│       ├── config.js           # Configuration
│       ├── logger.js           # Logging
│       └── notify.js           # Notifications
└── templates/
    └── sync-config.yaml        # Config template
```

## License

MIT License

## Version History

- **2.0.0** - Complete rewrite in JavaScript for cross-platform support
- **1.0.0** - Initial shell-based version (Linux/macOS only)
