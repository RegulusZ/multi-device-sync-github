---
name: multi-device-sync-github
description: Multi-device OpenClaw data synchronization using GitHub. Manages workspace data sync across multiple machines (Ubuntu, Mac, etc.) with automatic push on file changes, periodic pull, and conflict detection. Use when setting up or managing OpenClaw across multiple devices, configuring data synchronization, resolving sync conflicts, or adding new devices to the sync network.
---

# Multi-Device Sync via GitHub

Synchronize OpenClaw workspace data across multiple machines using a private GitHub repository.

## Features

- **Automatic push**: File changes trigger immediate git commit + push (via inotifywait/fswatch)
- **Periodic pull**: Every 5 minutes, pull remote changes
- **Conflict detection**: Manual resolution required on conflicts
- **Multi-device support**: Each device uses distinct file prefixes for memory files
- **Cross-platform**: Works on Linux (inotifywait) and macOS (fswatch)
- **Selective sync**: Only essential data synced, logs/temp excluded

## Architecture

```
Device A (Ubuntu) ◄────► GitHub Repo ◄────► Device B (Mac)
       │                      │                    │
   auto-push              central              auto-push
  定时pull                 hub               定时pull
```

## Prerequisites

### Linux (Ubuntu)
```bash
sudo apt-get install -y inotify-tools
```

### macOS
```bash
brew install fswatch
```

## Quick Start

### 1. Create GitHub Repository

Create a **private** repository on GitHub (e.g., `openclaw_sync`).

### 2. Initialize on First Device

```bash
# Clone the skill (if not already)
cd ~/openclaw-skills
# Assuming skill is already at: multi-device-sync-github/

# Clone your sync repo
git clone git@github.com:YOURNAME/openclaw_sync.git ~/openclaw-sync

# Initialize
cd ~/openclaw-sync
~/openclaw-skills/multi-device-sync-github/scripts/sync-init \
  --device-name ubuntu \
  --repo-url "git@github.com:YOURNAME/openclaw_sync.git"

# Start sync daemon
~/openclaw-skills/multi-device-sync-github/scripts/sync-daemon start
```

### 3. Add Second Device

```bash
# On Mac Mini
git clone git@github.com:YOURNAME/openclaw_sync.git ~/openclaw-sync

cd ~/openclaw-sync
~/openclaw-skills/multi-device-sync-github/scripts/sync-init \
  --device-name macmini \
  --repo-url "git@github.com:YOURNAME/openclaw_sync.git"

~/openclaw-skills/multi-device-sync-github/scripts/sync-daemon start
```

## How It Works

### Symlink Architecture

The skill creates symlinks from your workspace to the sync repo:

```
~/.openclaw/workspace/
├── SOUL.md      → ~/openclaw-sync/SOUL.md (symlink)
├── USER.md      → ~/openclaw-sync/USER.md (symlink)
├── MEMORY.md    → ~/openclaw-sync/MEMORY.md (symlink)
├── TOOLS.md     → ~/openclaw-sync/TOOLS.md (symlink)
├── memory/      → ~/openclaw-sync/memory/ (symlink)
└── skills/      → ~/openclaw-sync/skills/ (symlink)
```

When you edit a file in workspace, you're actually editing the sync repo file.

### Auto-Push Flow

```
File changed in workspace
    ↓ (symlink)
File changed in sync repo
    ↓ (inotifywait/fswatch)
Wait 2 seconds (debounce)
    ↓
git add -A && git commit && git push
```

### Periodic Pull

Every 5 minutes (configurable), the daemon pulls remote changes.

## Configuration

Edit `~/.config/openclaw/sync-config.yaml`:

```yaml
repo_url: "git@github.com:YOURNAME/openclaw_sync.git"
sync_interval_minutes: 5
device_name: "ubuntu"  # Change per device: macmini, laptop, etc.
conflict_strategy: "notify"
auto_pull_on_start: true

paths:
  sync:
    - "SOUL.md"
    - "USER.md"
    - "MEMORY.md"
    - "memory/"
    - "skills/"
    - "TOOLS.md"
  ignore:
    - "logs/"
    - "temp/"
    - "*.log"
```

## File Naming Convention

Memory files use device prefix to avoid conflicts:

```
memory/
├── ubuntu-2026-03-01.md      # Ubuntu device
├── macmini-2026-03-01.md     # Mac Mini device
└── laptop-2026-03-01.md      # Laptop device
```

Shared files (no prefix):
- `SOUL.md`
- `USER.md`
- `MEMORY.md`
- `TOOLS.md`

## Commands

| Command | Description |
|---------|-------------|
| `sync-init --device-name <name>` | Initialize git repo and config |
| `sync-status` | Check sync status |
| `sync-now` | Immediate pull + push |
| `sync-pull` | Manual pull |
| `sync-push` | Manual push |
| `sync-resolve` | Interactive conflict resolution |
| `sync-daemon start/stop/restart/status` | Manage background sync |

## Conflict Resolution

When conflicts detected:

1. Sync paused automatically
2. Run `sync-resolve` to:
   - View conflicting files
   - Choose: keep-local / keep-remote / merge-manual / view-diff
3. Resume sync after resolution

## Adding New Device

1. Clone repo: `git clone git@github.com:YOURNAME/openclaw_sync.git`
2. Install file watcher (inotify-tools or fswatch)
3. Run `./scripts/sync-init --device-name NEWNAME`
4. Start daemon: `./scripts/sync-daemon start`

## Troubleshooting

### File watcher not found

**Linux:**
```bash
sudo apt-get install inotify-tools
```

**macOS:**
```bash
brew install fswatch
```

### Git authentication failed

Use SSH keys:
```bash
git remote set-url origin git@github.com:USER/REPO.git
ssh -T git@github.com  # Test connection
```

### Daemon not starting

Check logs:
```bash
tail -f ~/.openclaw/sync-daemon.log
```

### Conflict loop

- Use device-prefixed memory files (auto-created)
- Avoid editing shared files (SOUL.md, USER.md) on multiple devices simultaneously
- Run `sync-resolve` to fix

## Security Note

**Use a private GitHub repository** to protect your personal data.

The following files may contain sensitive information:
- `MEMORY.md` - May include IP addresses, service URLs
- `memory/` - Daily logs with potentially sensitive details

## Manual Recovery

If everything breaks:

```bash
# 1. Stop daemon
sync-daemon stop

# 2. Backup local changes
cp -r ~/openclaw-sync ~/openclaw-sync-backup-$(date +%s)

# 3. Reset to remote
cd ~/openclaw-sync
git fetch origin
git reset --hard origin/main

# 4. Re-apply local changes manually

# 5. Restart
sync-daemon start
```

## Files in This Skill

```
multi-device-sync-github/
├── SKILL.md                  # This file
├── scripts/
│   ├── sync-init             # Initialize sync repo
│   ├── sync-daemon           # Background sync (pull + push watcher)
│   ├── sync-push             # Push changes to remote
│   ├── sync-pull             # Pull changes from remote
│   ├── sync-status           # Show sync status
│   ├── sync-now              # Immediate sync
│   ├── sync-resolve          # Conflict resolution
│   └── sync-notify           # Notification helper
└── references/
    └── troubleshooting.md    # Common issues
```

---

*Last updated: 2026-03-01*
