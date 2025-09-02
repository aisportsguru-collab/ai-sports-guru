import os, sys
from supabase import create_client

if len(sys.argv) < 2:
    print("Usage: python3 scripts/peek_table.py <table_name>")
    sys.exit(1)

url = os.environ["SUPABASE_URL"]
key = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not key:
    raise RuntimeError("Missing SUPABASE_SERVICE_ROLE (or SUPABASE_SERVICE_ROLE_KEY)")

supabase = create_client(url, key)
tbl = sys.argv[1]
res = supabase.table(tbl).select("*").limit(3).execute()
rows = res.data or []
print(f"Table: {tbl}")
if not rows:
    print("  (no rows)")
    sys.exit(0)
# Show columns and a sample row
cols = sorted({k for r in rows for k in r.keys()})
print("Columns:", cols)
print("Sample row 0 keys:", list(rows[0].keys()))
