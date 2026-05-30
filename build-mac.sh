#!/bin/bash
# Сборка VideoUniquer Pro для macOS (.dmg)
# Запускать только на Mac: chmod +x build-mac.sh && ./build-mac.sh

set -e
cd "$(dirname "$0")"

echo "========================================"
echo "  VideoUniquer Pro — сборка для macOS"
echo "========================================"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Ошибка: сборка .dmg возможна только на macOS."
  exit 1
fi

ARCH_DIR="resources/bin/mac/$(uname -m)"
if [[ "$(uname -m)" == "arm64" ]]; then
  ARCH_SUB="arm64"
else
  ARCH_SUB="x64"
fi
ARCH_DIR="resources/bin/mac/$ARCH_SUB"
mkdir -p "$ARCH_DIR"

if [[ ! -f "$ARCH_DIR/ffmpeg" ]] || [[ ! -f "$ARCH_DIR/ffprobe" ]]; then
  if command -v ffmpeg &>/dev/null; then
    cp "$(command -v ffmpeg)" "$ARCH_DIR/ffmpeg"
    cp "$(command -v ffprobe)" "$ARCH_DIR/ffprobe"
  else
    echo ""
    echo "Положите ffmpeg и ffprobe в $ARCH_DIR/"
    echo "Скачать: https://evermeet.cx/ffmpeg/"
    exit 1
  fi
fi

chmod +x "$ARCH_DIR/ffmpeg" "$ARCH_DIR/ffprobe" 2>/dev/null || true

export CSC_IDENTITY_AUTO_DISCOVERY=false

npm run build:mac

echo ""
echo "Готово!"
echo "Установщик: release/VideoUniquer Pro-Setup-1.0.0-mac.dmg"
echo ""
echo "На чужом Mac без подписи Apple: ПКМ по .dmg → Открыть"
