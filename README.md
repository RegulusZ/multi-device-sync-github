# Multi-Device Sync via GitHub

Synchronize OpenClaw workspace data across multiple machines using a private GitHub repository.

## Features

- **Automatic push**: File changes trigger immediate git commit + push
- **Periodic pull**: Every 5 minutes, pull remote changes
- **Conflict detection**: Manual resolution required on conflicts
- **Multi-device support**: Each device uses distinct file prefixes
- **Cross-platform**: Works on Linux (inotifywait) and macOS (fswatch)

## Quick Start

```bash
# Install dependencies
# Linux: sudo apt-get install -y git inotify-tools
# Mac: brew install git fswatch

# Clone this skill
git clone https://github.com/RegulusZ/openclaw-skills.git ~/openclaw-skills

# Clone your sync repo
git clone git@github.com:YOURNAME/openclaw_sync.git ~/openclaw-sync

# Initialize
cd ~/openclaw-sync
~/openclaw-skills/multi-device-sync-github/scripts/sync-init \
  --device-name mydevice \
  --repo-url "git@github.com:YOURNAME/openclaw_sync.git"

# Start daemon
~/openclaw-skills/multi-device-sync-github/scripts/sync-daemon start
```

## Documentation

See [SKILL.md](./SKILL.md) for full documentation.
