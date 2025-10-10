#!/usr/bin/env bash
set -euo pipefail
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL not set}"
psql "$SUPABASE_DB_URL" -c "select current_user, current_database(), inet_server_addr(), inet_server_port();" >/dev/null
echo "DB check OK"
