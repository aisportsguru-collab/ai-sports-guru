#!/usr/bin/env bash
set -euo pipefail
DOMAIN="${1:-aisportsguru.com}"
TODAY="$(date -u +%F)"
candidates=(
  "https://$DOMAIN/api"
  "https://$DOMAIN/api/v1"
  "https://$DOMAIN/v1"
  "https://api.$DOMAIN"
  "https://api.$DOMAIN/v1"
  "https://$DOMAIN"
)
paths=(
  "/leagues"
  "/leagues/nfl/games?date=$TODAY"
  "/predictions?league=nfl&date=$TODAY"
)
for base in "${candidates[@]}"; do
  echo "== Testing base: $base"
  ok=0
  for path in "${paths[@]}"; do
    url="$base$path"
    code=$(curl -sS -m 10 -o /dev/null -w "%{http_code}" "$url" || echo "000")
    ctype=$(curl -sS -m 10 -o /dev/null -w "%{content_type}" "$url" || echo "n/a")
    head="$(curl -sS -m 10 "$url" | head -c 160 | tr '\n' ' ')"
    echo "  $code $ctype  $path"
    echo "    $head"
    [[ "$code" == 200 ]] && [[ "$ctype" == application/json* || "$head" =~ ^[\{\[] ]] && ok=1
  done
  if [[ $ok == 1 ]]; then
    echo ">> Looks good: $base"
  fi
done
