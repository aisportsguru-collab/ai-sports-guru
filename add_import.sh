#!/bin/bash
set -euo pipefail

add_import() {
  f="$1"
  if [ ! -f "$f" ]; then
    echo "Missing file: $f" >&2
    exit 1
  fi
  # insert only if not present
  if ! rg -q 'fetchJson' "$f"; then
    if rg -n -q "^(\"use client\"|'use client')" "$f"; then
      # insert on line 2 (after 'use client')
      sed -i '' '2i\
import { fetchJson } from "@/lib/fetchJson";
' "$f"
    else
      sed -i '' '1i\
import { fetchJson } from "@/lib/fetchJson";
' "$f"
    fi
    echo "Inserted fetchJson import: $f"
  else
    echo "Already has fetchJson import: $f"
  fi
}

add_import "app/(sports)/LeaguePage.tsx"
add_import "app/(sports)/[league]/page.tsx"
