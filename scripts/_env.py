import os
from pathlib import Path

def _load_line_file(p):
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        os.environ.setdefault(k.strip(), v)

# Only populate if not already set by the shell/CI
if not os.environ.get("SUPABASE_URL"):
    p = Path(".env.predict")
    if p.exists():
        _load_line_file(p)
