#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEST_DIR="$ROOT_DIR/ios/ImposterGames/Resources/Content"

mkdir -p "$DEST_DIR"

for file in circa-questions.json classic-words.json who-am-i.json charades.json; do
  cp "$ROOT_DIR/data/$file" "$DEST_DIR/$file"
done

echo "iOS content synced from root data/."
