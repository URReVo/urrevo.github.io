#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen fehlt. Auf macOS: brew install xcodegen" >&2
  exit 1
fi

"$SCRIPT_DIR/sync-content.sh"
cd "$IOS_DIR"
xcodegen generate

echo "Generated: $IOS_DIR/ImposterGames.xcodeproj"
