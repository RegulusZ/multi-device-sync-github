#!/bin/bash
# Push local changes to remote

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_REPO="${SYNC_REPO:-$HOME/openclaw-sync}"
CONFIG_FILE="$HOME/.config/openclaw/sync-config.yaml"

# Load config
if [[ -f "$CONFIG_FILE" ]]; then
    DEVICE_NAME=$(grep "device_name:" "$CONFIG_FILE" | awk '{print $2}' | tr -d '"')
fi
DEVICE_NAME="${DEVICE_NAME:-unknown}"

cd "$SYNC_REPO"

# Check if git repo
if [[ ! -d ".git" ]]; then
    echo "Error: Not a git repository. Run sync-init first."
    exit 1
fi

# Check if remote is configured
if ! git remote | grep -q "origin"; then
    echo "Error: No remote 'origin' configured."
    echo "Run: git remote add origin <your-repo-url>"
    exit 1
fi

# Check for changes (including untracked files)
if git diff --quiet HEAD 2>/dev/null && git diff --cached --quiet 2>/dev/null && [[ -z $(git ls-files --others --exclude-standard) ]]; then
    # No changes
    exit 0
fi

# Add all changes
git add -A

# Check if there's anything to commit
if git diff --cached --quiet 2>/dev/null; then
    exit 0
fi

# Commit with device info
COMMIT_MSG="sync(${DEVICE_NAME}): auto-update at $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG"

# Determine the main branch
MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || git branch --show-current)

if [[ -z "$MAIN_BRANCH" ]]; then
    MAIN_BRANCH="main"
fi

# Try to push
MAX_RETRIES=2
RETRY_COUNT=0

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if git push origin "$MAIN_BRANCH" 2>/dev/null; then
        echo "✓ Pushed: $COMMIT_MSG"
        
        # Send notification
        if command -v "$SCRIPT_DIR/sync-notify" &> /dev/null; then
            "$SCRIPT_DIR/sync-notify" "push" "$COMMIT_MSG" &
        fi
        
        exit 0
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        
        if [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; then
            echo "⚠ Push failed, pulling and retrying..."
            
            # Pull first
            "$SCRIPT_DIR/sync-pull" || true
            
            # Rebase our commit on top
            git rebase "origin/$MAIN_BRANCH" 2>/dev/null || {
                echo "⚠ Rebase failed, conflict detected"
                exit 1
            }
        fi
    fi
done

echo "⚠ Push failed after $MAX_RETRIES attempts"
exit 1
