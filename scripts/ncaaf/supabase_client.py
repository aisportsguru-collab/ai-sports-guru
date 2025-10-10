#!/usr/bin/env python3
import os
import sys
import psycopg

def get_db_url() -> str:
    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        raise RuntimeError("SUPABASE_DB_URL not set")
    return url

def ping() -> int:
    url = get_db_url()
    try:
        with psycopg.connect(url) as conn:
            with conn.cursor() as cur:
                cur.execute("select current_user, current_database(), inet_server_addr(), inet_server_port();")
                row = cur.fetchone()
                print("DB OK:", row)
        return 0
    except Exception as e:
        print(f"DB ERROR: {e!r}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(ping())
