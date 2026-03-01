#!/bin/bash
# Multi-Device Sync for OpenClaw - One-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/RegulusZ/openclaw-skills/main/multi-device-sync-github/install.sh | bash

set -e

REPO_URL="${REPO_URL:-}"
DEVICE_NAME="${DEVICE_NAME:-}"
SKIP_DEPS="${SKIP_DEPS:-false}"

echo "🚀 OpenClaw Multi-Device Sync Installer"
echo ""

# Detect OS
OS=$(uname -s)
if [[ "$OS" == "Darwin" ]]; then
    PLATFORM="macos"
else
    PLATFORM="linux"
fi

echo "📋 Platform: $PLATFORM"

# Install dependencies
if [[ "$SKIP_DEPS" != "true" ]]; then
    echo ""
    echo "📦 Installing dependencies..."
    
    if [[ "$PLATFORM" == "macos" ]]; then
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew not found. Please install first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
        
        if ! command -v fswatch &> /dev/null; then
            echo "Installing fswatch..."
            brew install fswatch
        else
            echo "✓ fswatch already installed"
        fi
    else
        if ! command -v inotifywait &> /dev/null; then
            echo "Installing inotify-tools..."
            sudo apt-get update
            sudo apt-get install -y inotify-tools
        else
            echo "✓ inotify-tools already installed"
        fi
    fi
    
    if ! command -v git &> /dev/null; then
        echo "Installing git..."
        if [[ "$PLATFORM" == "macos" ]]; then
            brew install git
        else
            sudo apt-get install -y git
        fi
    fi
fi

# Clone skill repo
echo ""
echo "📥 Cloning skill repository..."
if [[ -d ~/openclaw-skills ]]; then
    cd ~/openclaw-skills
    git pull origin main
else
    git clone https://github.com/RegulusZ/multi-device-sync-github.git ~/openclaw-skills
fi
echo "✓ Skill cloned to ~/openclaw-skills"

# Get sync repo URL
if [[ -z "$REPO_URL" ]]; then
    echo ""
    read -p "🔗 Enter your GitHub sync repo URL (e.g., git@github.com:YOURNAME/openclaw_sync.git): " REPO_URL
fi

# Get device name
if [[ -z "$DEVICE_NAME" ]]; then
    echo ""
    DEFAULT_NAME=$(hostname -s)
    read -p "💻 Enter device name [$DEFAULT_NAME]: " DEVICE_NAME
    DEVICE_NAME="${DEVICE_NAME:-$DEFAULT_NAME}"
fi

# Clone or init sync repo
echo ""
echo "📂 Setting up sync repository..."
if [[ -d ~/openclaw-sync ]]; then
    echo "Sync repo already exists at ~/openclaw-sync"
    cd ~/openclaw-sync
    git remote -v | grep -q "$REPO_URL" || git remote set-url origin "$REPO_URL"
else
    if git ls-remote "$REPO_URL" &> /dev/null; then
        git clone "$REPO_URL" ~/openclaw-sync
    else
        echo "⚠️  Remote repo not accessible. Creating local repo..."
        mkdir -p ~/openclaw-sync
        cd ~/openclaw-sync
        git init
        git remote add origin "$REPO_URL"
    fi
fi

# Run sync-init
echo ""
echo "🔧 Initializing sync..."
cd ~/openclaw-sync
~/openclaw-skills/multi-device-sync-github/scripts/sync-init \
    --device-name "$DEVICE_NAME" \
    --repo-url "$REPO_URL"

# Create scripts symlink
cd ~/openclaw-sync
rm -f scripts
ln -s ~/openclaw-skills/multi-device-sync-github/scripts scripts

# Start daemon
echo ""
echo "▶️  Starting sync daemon..."
~/openclaw-skills/multi-device-sync-github/scripts/sync-daemon start

echo ""
echo "✅ Installation complete!"
echo ""
echo "📊 Status:"
~/openclaw-skills/multi-device-sync-github/scripts/sync-status

echo ""
echo "📝 Next steps:"
echo "   1. If this is your first device, push initial commit:"
echo "      cd ~/openclaw-sync && ./scripts/sync-push"
echo "   2. On other devices, run the same installer"
echo "   3. Your workspace files will sync automatically!"
echo ""
echo "💡 Useful commands:"
echo "   sync-daemon status    # Check daemon status"
echo "   sync-now              # Manual sync"
echo "   sync-status           # View sync status"
