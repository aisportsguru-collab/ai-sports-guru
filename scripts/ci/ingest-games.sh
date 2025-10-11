#!/usr/bin/env bash
set -euo pipefail

league="${1:-}"
days="${2:-}"

echo "🎯 Starting ingest-games.sh for $league ($days days)..."

# Show all relevant envs
echo "Checking Supabase and API environment..."
for v in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_KEY ODDS_API_KEY; do
  val="${!v:-}"
  if [ -z "$val" ]; then
    echo "::error::Missing $v"
    env | grep SUPABASE || true
    echo "Environment missing required variable: $v"
    exit 1
  fi
done

# Create a safe temporary .env
cat > .env.ci <<EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_KEY=${SUPABASE_KEY}
ODDS_API_KEY=${ODDS_API_KEY}
EOF
echo "✅ Environment file created for ingest"

# Run the node ingest script
if [ ! -f scripts/fetch-odds-rest.mjs ]; then
  echo "::error::Missing scripts/fetch-odds-rest.mjs"
  exit 1
fi

node ./scripts/fetch-odds-rest.mjs "$league" "$days" 2>&1 | tee run.log || true

if grep -Eqi 'duplicate key|violates unique constraint|23505|409' run.log; then
  echo "::warning::Duplicates detected, continuing gracefully"
  exit 0
fi

if grep -Eqi 'Missing Supabase|ECONNREFUSED|Error' run.log; then
  echo "::error::Critical error detected in run.log"
  tail -n 50 run.log
  exit 1
fi

echo "🎉 Ingest completed successfully!"
