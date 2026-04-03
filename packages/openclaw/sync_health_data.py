#!/usr/bin/env python3
"""
Sync model_status.json from health-checker to openclaw/data/model-health.json
Adds summary metadata. Run via cron after health checker.
"""
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

SRC  = Path.home() / ".openclaw/health-checker/model_status.json"
DEST = Path.home() / "openclaw/data/model-health.json"

def sync():
    if not SRC.exists():
        print("Source not found: %s" % SRC)
        return

    with open(SRC) as f:
        state = json.load(f)

    models = state.get("models", {})
    total    = len(models)
    healthy  = sum(1 for m in models.values() if m.get("status") == "ok")
    degraded = sum(1 for m in models.values()
                   if m.get("status") != "ok" and m.get("consecutive_failures", 0) < 3)
    down     = sum(1 for m in models.values()
                   if m.get("consecutive_failures", 0) >= 3)

    output = {
        "synced_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "summary": {
            "total": total,
            "healthy": healthy,
            "degraded": degraded,
            "down": down,
        },
        "models": models,
        "failover_routes": state.get("failover_routes", {}),
    }

    DEST.parent.mkdir(parents=True, exist_ok=True)
    with open(DEST, "w") as f:
        json.dump(output, f, indent=2)

    print("[%s] Synced: total=%d healthy=%d degraded=%d down=%d" % (
        output["synced_at"], total, healthy, degraded, down))

if __name__ == "__main__":
    sync()
