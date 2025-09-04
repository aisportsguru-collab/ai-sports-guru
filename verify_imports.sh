#!/usr/bin/env bash
set -euo pipefail

files=("app/(sports)/LeaguePage.tsx" "app/(sports)/[league]/page.tsx")

for f in "${files[@]}"; do
  if [[ -f "$f" ]]; then
    echo "===== HEAD of $f ====="
    head -n 5 "$f"
    echo
  else
    echo "Missing file: $f" >&2
  fi
done
