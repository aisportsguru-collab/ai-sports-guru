#!/usr/bin/env bash
set -euo pipefail
Y=$(date +%Y)
export SEASONS="$((Y-1)),$((Y-2))"
bash scripts/data-sync/ncaaf_sync.sh
