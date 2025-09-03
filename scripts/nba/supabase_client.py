#!/usr/bin/env python3
import os
from pathlib import Path
from supabase import create_client

def _load_env_local_once():
    p = Path(".env.local")
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip("'").strip('"')
        if k and k not in os.environ:
            os.environ[k] = v

def get_client():
    if "SUPABASE_URL" not in os.environ and "NEXT_PUBLIC_SUPABASE_URL" not in os.environ:
        _load_env_local_once()
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY.")
    return create_client(url, key)
