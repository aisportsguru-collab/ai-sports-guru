import os, json, time, hashlib, pathlib, threading, errno

CACHE_DIR = os.getenv("CFBD_CACHE_DIR", os.path.expanduser("~/.cache/aisg-cfbd"))
_lock = threading.Lock()

def _key(url, params):
    raw = url + "|" + "&".join(f"{k}={v}" for k, v in sorted((params or {}).items()))
    return hashlib.sha256(raw.encode()).hexdigest()

def get_cached(url, params=None, ttl_seconds=86400):
    pathlib.Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)
    fn = os.path.join(CACHE_DIR, _key(url, params) + ".json")
    try:
        st = os.stat(fn)
        if time.time() - st.st_mtime < ttl_seconds:
            with open(fn, "r") as f:
                return json.load(f)
    except FileNotFoundError:
        return None
    except OSError:
        return None
    return None

def set_cached(url, params, data):
    pathlib.Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)
    fn = os.path.join(CACHE_DIR, _key(url, params) + ".json")
    tmp = fn + ".tmp"
    body = json.dumps(data)
    with _lock:
        with open(tmp, "w") as f:
            f.write(body)
        try:
            os.replace(tmp, fn)
        except OSError as e:
            if e.errno != errno.ENOENT:
                raise
