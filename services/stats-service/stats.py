import os
import time

from flask import Flask

app = Flask(__name__)
STARTED = time.time()
COUNTERS = {"metrics": 0, "debug": 0}


@app.get("/health")
def health():
    return {"status": "ok", "service": "marketvault-stats"}


@app.get("/metrics")
def metrics():
    COUNTERS["metrics"] += 1
    return {
        "service": "marketvault-stats",
        "internal": True,
        "uptime_seconds": round(time.time() - STARTED, 1),
        "metrics_requests": COUNTERS["metrics"],
        "pid": os.getpid(),
    }


@app.get("/debug")
def debug():
    COUNTERS["debug"] += 1
    return {
        "service": "marketvault-stats",
        "internal": True,
        "flag": os.environ.get("STATS_FLAG", "MV{SSRF_STATS_INTERNAL}"),
        "debug_requests": COUNTERS["debug"],
        "env_keys": sorted(os.environ.keys()),
        "cwd": os.getcwd(),
    }


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)