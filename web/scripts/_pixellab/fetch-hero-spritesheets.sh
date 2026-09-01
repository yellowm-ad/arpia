#!/usr/bin/env bash
# PixelLab 캐릭터 6종의 "Spritesheet (PNG + JSON)" export 를 내려받아
# scripts/_pixellab/<hero>/ 에 풀어 놓는다. 이후 `node scripts/build-hero-sheets.mjs`.
#
# 사용: bash scripts/_pixellab/fetch-hero-spritesheets.sh
set -euo pipefail
cd "$(dirname "$0")"

declare -A CHARS=(
  [fire-male]=62522008-42ca-4a1d-a802-e698b26a9a60
  [fire-female]=d4d14b7f-007e-4176-9884-7e9b987d6707
  [ice-male]=a9b48a80-d2d2-47c0-827d-590009fc2294
  [ice-female]=e747f40f-148e-4d8d-b97e-a15ea9882726
  [earth-male]=78bae28b-7836-40c4-8584-cc958851201e
  [earth-female]=7d4b3b99-507a-4f6d-a856-aed1c7ee568d
)

for name in "${!CHARS[@]}"; do
  id="${CHARS[$name]}"
  echo "→ $name ($id)"
  mkdir -p "$name"
  curl -sS -L -f -o "$name/_sheet.zip" \
    "https://api.pixellab.ai/mcp/characters/$id/spritesheet"
  ( cd "$name" && rm -f ./*.png ./*.json && unzip -o -q _sheet.zip && rm -f _sheet.zip )
  ls "$name"
done
echo "done. 다음: node scripts/build-hero-sheets.mjs"
