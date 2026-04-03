#!/usr/bin/env python3
"""OpenClaw Services Monitor - checks service health by group."""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import datetime, timezone

# Import telegram helper
sys.path.insert(0, '/home/<USUARIO>/openclaw')
from telegram_utils import send_telegram, escape_html

STATE_FILE = "/home/<USUARIO>/openclaw/data/services-health.json"

# Alert cooldowns in seconds
ALERT_COOLDOWNS = {
    "critical": 0,       # No cooldown - alert immediately
    "high": 300,          # 5 min cooldown
    "medium": 900,        # 15 min cooldown
    "low": 1800           # 30 min cooldown
}

# Alert emojis
ALERT_EMOJI = {
    "critical": "\U0001f534",   # red circle
    "high": "\U0001f7e0",       # orange circle
    "medium": "\U0001f7e1",     # yellow circle
    "low": "\u26aa",            # white circle
}

RECOVERED_EMOJI = "\U0001f7e2"  # green circle

# ── Service definitions ──────────────────────────────────────────────

GROUPS = {
    "iatrader-critical": {
        "risk_guardian": {
            "check": "http", "url": "http://localhost:8346/health",
            "alert": "critical",
        },
        "position_monitor": {
            "check": "http", "url": "http://localhost:8350/health",
            "alert": "critical",
        },
        "mt5_real": {
            "check": "rpyc", "port": 18813,
            "alert": "critical",
        },
        "executor_agent": {
            "check": "http", "url": "http://localhost:8324/health",
            "alert": "critical",
        },
    },
    "iatrader": {
        "brain_agent": {
            "check": "http", "url": "http://localhost:8326/health",
            "alert": "high",
        },
        "strategy_agent": {
            "check": "http", "url": "http://localhost:8322/health",
            "alert": "medium",
        },
        "validator_agent": {
            "check": "http", "url": "http://localhost:8323/health",
            "alert": "medium",
        },
        "data_collector": {
            "check": "http", "url": "http://localhost:8320/health",
            "alert": "high",
        },
        "ai_filter": {
            "check": "http", "url": "http://localhost:8340/health",
            "alert": "medium",
        },
        "notification_agent": {
            "check": "http", "url": "http://localhost:8325/health",
            "alert": "medium",
        },
        "n8n": {
            "check": "http", "url": "http://localhost:5678/healthz",
            "alert": "high",
        },
        "mt5_demo": {
            "check": "rpyc", "port": 18812,
            "alert": "medium",
        },
        "metatrader_process": {
            "check": "process", "pattern": "terminal64.exe",
            "alert": "high",
        },
    },
    "infrastructure": {
        "cliproxyapi": {
            "check": "http",
            "url": "http://localhost:8317/v1/models",
            "headers": {"Authorization": "Bearer sk-GazR6oQwVsbxdaMK5PE_Ht-88lUn3IALdwtwyZg6eWo"},
            "alert": "high",
        },
        "perplexity_proxy": {
            "check": "http", "url": "http://localhost:8318/v1/models",
            "alert": "medium",
        },
        "openclaw_gateway": {
            "check": "http", "url": "http://localhost:18790/",
            "alert": "medium",
        },
        "openclaw_health_api": {
            "check": "http", "url": "http://localhost:9091/api/health",
            "alert": "medium",
        },
        "ir2_api": {
            "check": "systemd", "service": "ir2-api.service",
            "alert": "medium",
        },
    },
    "apps": {
        "dgii_scraper_api": {
            "check": "http", "url": "http://localhost:8321/health",
            "alert": "low",
        },
        "gestoriard": {
            "check": "http", "url": "http://localhost:3000/api/health",
            "accept_codes": [200, 308],
            "alert": "medium",
        },
        "gestoriard_waf": {
            "check": "docker", "container": "nginx-waf-gestoriard",
            "alert": "medium",
        },
        "facturaia_ocr": {
            "check": "docker", "container": "facturaia-ocr",
            "alert": "low",
        },
    },
    "databases": {
        "supabase_db": {
            "check": "docker_exec",
            "container": "supabase-db",
            "command": ["pg_isready"],
            "alert": "critical",
        },
        "supabase_rest": {
            "check": "docker", "container": "supabase-rest",
            "alert": "high",
        },
        "supabase_kong": {
            "check": "docker", "container": "supabase-kong",
            "alert": "high",
        },
    },
}


# ── Check functions ──────────────────────────────────────────────────

def check_http(svc_def):
    """HTTP health check. Returns (ok: bool, detail: str)."""
    url = svc_def["url"]
    accept = svc_def.get("accept_codes", [200])
    headers = svc_def.get("headers", {})
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            code = resp.getcode()
            if code in accept or 200 <= code < 300:
                return True, f"HTTP {code}"
            return False, f"HTTP {code}"
    except urllib.error.HTTPError as e:
        if e.code in accept:
            return True, f"HTTP {e.code}"
        return False, f"HTTP {e.code}"
    except Exception as e:
        return False, str(e)


def check_rpyc(svc_def):
    """rpyc port check via subprocess."""
    port = svc_def["port"]
    cmd = [
        "python3", "-c",
        f"import rpyc; c=rpyc.connect('localhost',{port}); print('ok')"
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if r.returncode == 0 and "ok" in r.stdout:
            return True, "rpyc ok"
        return False, r.stderr.strip()[:120] or "rpyc connect failed"
    except subprocess.TimeoutExpired:
        return False, "rpyc timeout"
    except Exception as e:
        return False, str(e)


def check_process(svc_def):
    """Check if process is running via pgrep."""
    pattern = svc_def["pattern"]
    try:
        r = subprocess.run(
            ["pgrep", "-f", pattern],
            capture_output=True, text=True, timeout=5
        )
        if r.returncode == 0 and r.stdout.strip():
            pids = r.stdout.strip().split('\n')
            return True, f"running (PIDs: {','.join(pids[:3])})"
        return False, "process not found"
    except Exception as e:
        return False, str(e)


def check_docker(svc_def):
    """Check if docker container is running."""
    container = svc_def["container"]
    try:
        r = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True, text=True, timeout=10
        )
        if r.returncode != 0:
            return False, f"docker ps failed: {r.stderr.strip()[:80]}"
        running = r.stdout.strip().split('\n')
        # Check both exact match and partial match
        for name in running:
            if container in name:
                return True, f"container running ({name})"
        return False, f"container '{container}' not found"
    except Exception as e:
        return False, str(e)


def check_docker_exec(svc_def):
    """Run a command inside a docker container."""
    container = svc_def["container"]
    command = svc_def["command"]
    try:
        r = subprocess.run(
            ["docker", "exec", container] + command,
            capture_output=True, text=True, timeout=10
        )
        if r.returncode == 0:
            return True, r.stdout.strip()[:80] or "ok"
        return False, r.stderr.strip()[:120] or f"exit {r.returncode}"
    except Exception as e:
        return False, str(e)


def check_systemd(svc_def):
    """Check systemd service status."""
    service = svc_def["service"]
    try:
        r = subprocess.run(
            ["systemctl", "is-active", service],
            capture_output=True, text=True, timeout=5
        )
        status = r.stdout.strip()
        if status == "active":
            return True, "active"
        return False, status or "unknown"
    except Exception as e:
        return False, str(e)


CHECKERS = {
    "http": check_http,
    "rpyc": check_rpyc,
    "process": check_process,
    "docker": check_docker,
    "docker_exec": check_docker_exec,
    "systemd": check_systemd,
}


# ── State management ─────────────────────────────────────────────────

def load_state():
    """Load state from JSON file, or return empty dict."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def save_state(state):
    """Atomically save state to JSON file."""
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=os.path.dirname(STATE_FILE), suffix=".tmp"
    )
    try:
        with os.fdopen(tmp_fd, 'w') as f:
            json.dump(state, f, indent=2, default=str)
        os.rename(tmp_path, STATE_FILE)
    except Exception:
        # Cleanup on failure
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


# ── Alert logic ──────────────────────────────────────────────────────

def should_alert(svc_state, alert_level):
    """Check if we should send an alert based on cooldown."""
    cooldown = ALERT_COOLDOWNS.get(alert_level, 900)
    if cooldown == 0:
        return True
    last_alert = svc_state.get("last_alert_at")
    if not last_alert:
        return True
    try:
        last_ts = datetime.fromisoformat(last_alert).timestamp()
        return (time.time() - last_ts) >= cooldown
    except (ValueError, TypeError):
        return True


def send_alert(service_name, group, svc_def, ok, detail, consecutive_failures):
    """Send Telegram alert for service status change."""
    now_str = datetime.now(timezone.utc).strftime("%H:%M UTC")
    alert_level = svc_def.get("alert", "medium")

    # Escape dynamic content to avoid breaking Telegram HTML parser
    safe_name = escape_html(service_name)
    safe_group = escape_html(group)
    safe_detail = escape_html(detail)

    if ok:
        emoji = RECOVERED_EMOJI
        msg = (
            f"{emoji} <b>RECOVERED</b>: {safe_name}\n"
            f"Group: {safe_group}\n"
            f"Detail: {safe_detail}\n"
            f"Time: {now_str}"
        )
    else:
        emoji = ALERT_EMOJI.get(alert_level, "\u26aa")
        msg = (
            f"{emoji} <b>DOWN [{alert_level.upper()}]</b>: {safe_name}\n"
            f"Group: {safe_group}\n"
            f"Detail: {safe_detail}\n"
            f"Consecutive failures: {consecutive_failures}\n"
            f"Time: {now_str}"
        )

    print(f"  ALERT -> Telegram: {service_name} {'recovered' if ok else 'DOWN'}")
    send_telegram(msg)


# ── Main logic ───────────────────────────────────────────────────────

def run_group(group_name):
    """Run all checks for a service group."""
    if group_name not in GROUPS:
        print(f"ERROR: Unknown group '{group_name}'. Available: {', '.join(GROUPS.keys())}")
        sys.exit(1)

    services = GROUPS[group_name]
    state = load_state()
    now_iso = datetime.now(timezone.utc).isoformat()
    changed = False

    print(f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}] "
          f"Checking group: {group_name} ({len(services)} services)")

    for svc_name, svc_def in services.items():
        check_type = svc_def["check"]
        checker = CHECKERS.get(check_type)
        if not checker:
            print(f"  {svc_name}: SKIP (unknown check type '{check_type}')")
            continue

        ok, detail = checker(svc_def)
        status = "ok" if ok else "down"
        status_icon = "\u2705" if ok else "\u274c"
        print(f"  {status_icon} {svc_name}: {status} ({detail})")

        # Get or create service state
        svc_state = state.get(svc_name, {})
        prev_status = svc_state.get("status")
        prev_failures = svc_state.get("consecutive_failures", 0)

        # Update state
        svc_state["status"] = status
        svc_state["last_check"] = now_iso
        svc_state["last_detail"] = detail
        svc_state["group"] = group_name
        svc_state["alert_level"] = svc_def.get("alert", "medium")

        if ok:
            svc_state["consecutive_failures"] = 0
            svc_state["last_ok"] = now_iso
        else:
            svc_state["consecutive_failures"] = prev_failures + 1

        # Detect status change and alert
        status_changed = prev_status is not None and prev_status != status
        alert_level = svc_def.get("alert", "medium")

        if status_changed:
            # Status changed - check cooldown
            if should_alert(svc_state, alert_level):
                send_alert(
                    svc_name, group_name, svc_def,
                    ok, detail, svc_state["consecutive_failures"]
                )
                svc_state["last_alert_at"] = now_iso
        elif not ok and prev_status == "down":
            # Still down - re-alert if cooldown expired (for critical services)
            if alert_level == "critical" and svc_state["consecutive_failures"] % 5 == 0:
                if should_alert(svc_state, alert_level):
                    send_alert(
                        svc_name, group_name, svc_def,
                        ok, detail, svc_state["consecutive_failures"]
                    )
                    svc_state["last_alert_at"] = now_iso

        state[svc_name] = svc_state
        changed = True

    if changed:
        save_state(state)

    # Summary
    total = len(services)
    down = sum(
        1 for s in services
        if state.get(s, {}).get("status") == "down"
    )
    print(f"  Summary: {total - down}/{total} ok, {down} down")


def main():
    parser = argparse.ArgumentParser(description="OpenClaw Services Monitor")
    parser.add_argument(
        "--group", required=True,
        choices=list(GROUPS.keys()),
        help="Service group to check"
    )
    args = parser.parse_args()
    run_group(args.group)


if __name__ == "__main__":
    main()
