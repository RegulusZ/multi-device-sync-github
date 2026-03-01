# Multi-Device Sync via GitHub

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Synchronize OpenClaw workspace data across multiple machines using a private GitHub repository.

## Features

- 🔄 **Automatic push** - File changes trigger immediate git commit + push
- ⏱️ **Periodic pull** - Configurable interval (default: 5 minutes)
- ⚠️ **Conflict detection** - Manual resolution required on conflicts
- 🖥️ **Multi-device support** - Each device uses distinct file prefixes
- 🌐 **Cross-platform** - Works on Linux (inotifywait) and macOS (fswatch)
- 📁 **Selective sync** - Choose which files to synchronize
- 💬 **Interactive setup** - Guided installation with customization options

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/RegulusZ/multi-device-sync-github/main/install.sh | bash
```

The interactive installer will guide you through:
1. Choose: First device (upload) or Add to existing sync (download)
2. Enter your GitHub sync repo URL
3. Name your device
4. Select files to sync
5. Configure sync interval

## Documentation

- [SKILL.md](./SKILL.md) - Full documentation
- [troubleshooting.md](./references/troubleshooting.md) - Common issues and solutions

## Requirements

- Git
- **Linux**: `inotify-tools`
- **macOS**: `fswatch`

## License

MIT License - See [LICENSE](LICENSE) for details.
