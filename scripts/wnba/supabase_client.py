import os
from typing import List, Dict, Any, Optional, Tuple
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def upsert_rows(client: Client, table: str, rows: List[Dict[str, Any]], on_conflict: Optional[str] = None) -> Tuple[int, int]:
    if not rows:
        return 0, 0
    try:
        q = client.table(table).upsert(rows, on_conflict=on_conflict).execute()
        # supabase v2 returns count only if count param is set, which we did not
        # We return len(rows) as attempted and 0 errors if no exception
        return len(rows), 0
    except Exception as e:
        print(f"WARN upsert_rows failed for table {table}: {e}")
        return 0, len(rows)

def select_one(client: Client, table: str, match: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        q = client.table(table).select("*").match(match).limit(1).execute()
        if q.data:
            return q.data[0]
        return None
    except Exception as e:
        print(f"WARN select_one failed for {table} {match}: {e}")
        return None

def insert_one(client: Client, table: str, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        q = client.table(table).insert(row).execute()
        if q.data:
            return q.data[0]
        return None
    except Exception as e:
        print(f"WARN insert_one failed for {table}: {e}")
        return None

def ensure_team(client: Client, sport: str, team_name: str, abbr: Optional[str] = None) -> Optional[str]:
    # Try to find by sport and name
    rec = select_one(client, "teams", {"sport": sport, "name": team_name})
    if rec and rec.get("id"):
        return rec["id"]
    # Create minimal team record
    row = {"sport": sport, "name": team_name}
    if abbr:
        row["abbreviation"] = abbr
    rec = insert_one(client, "teams", row)
    return rec.get("id") if rec else None

def ensure_player(client: Client, sport: str, player_name: str, team_id: Optional[str]) -> Optional[str]:
    # First try exact match by sport and name
    rec = select_one(client, "players", {"sport": sport, "full_name": player_name})
    if rec and rec.get("id"):
        # Optionally attach team_id if missing
        if team_id and not rec.get("team_id"):
            try:
                client.table("players").update({"team_id": team_id}).eq("id", rec["id"]).execute()
            except Exception:
                pass
        return rec["id"]
    # Create
    row = {"sport": sport, "full_name": player_name}
    if team_id:
        row["team_id"] = team_id
    rec = insert_one(client, "players", row)
    return rec.get("id") if rec else None
