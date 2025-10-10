#!/usr/bin/env bash
set -o pipefail
league="$1"
days="$2"
code=0
node ./scripts/ingest/games.mjs "$league" "$days" > run.log 2>&1 || code=$?
if [ "${code:-0}" != "0" ]; then
  if grep -Eqi 'duplicate key value|violates unique constraint|code["'\'': ]*23505|status[^0-9]*409' run.log; then
    echo "::warning::Duplicates ignored (409/23505). Continuing."
    exit 0
  fi
  msg="$(sed 's/%/%25/g;s/\r/%0D/g;s/\n/%0A/g' run.log)"
  echo "::error::${msg}"
  exit "${code}"
fi
