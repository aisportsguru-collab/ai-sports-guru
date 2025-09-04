#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL missing}"
: "${SUPABASE_SERVICE_ROLE:?SUPABASE_SERVICE_ROLE missing}"

AUTH=(-H "apikey: $SUPABASE_SERVICE_ROLE" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE" -H "Prefer: count=exact")

from=$(date -u +%Y-%m-%dT00:00:00Z)
to=$(date -u -v+30d +%Y-%m-%dT00:00:00Z 2>/dev/null || date -u -d '+30 days' +%Y-%m-%dT00:00:00Z)

tables=(
  predictions_latest model_predictions predictions game_predictions
  nfl_predictions_latest ncaaf_predictions_latest mlb_predictions_latest
  nfl_model_predictions ncaaf_model_predictions mlb_model_predictions
  nfl_predictions ncaaf_predictions mlb_predictions
  nfl_schedule ncaaf_schedule mlb_schedule schedule
  nfl_games ncaaf_games mlb_games games_nfl games_ncaaf games_mlb
)

echo "Window: $from .. $to"
echo

for t in "${tables[@]}"; do
  url="$SUPABASE_URL/rest/v1/$t?game_time=gte.$from&game_time=lte.$to&select=*&limit=1"
  hdr=$(curl -sI "$url" "${AUTH[@]}" || true)
  cr=$(echo "$hdr" | awk -F': ' 'tolower($1)=="content-range"{print $2}')
  echo "[$t] Content-Range: ${cr:-unknown}"
  curl -s "$url" "${AUTH[@]}" | jq '.[0] // {}'
  echo
done
