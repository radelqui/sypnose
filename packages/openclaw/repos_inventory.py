#!/usr/bin/env python3
"""
repos_inventory.py - Inventario de repos GitHub para OpenClaw.

Consulta repos de radelqui y CarlosHuyghusrl via gh CLI,
guarda inventario en ~/.openclaw/repos_inventory.json y
actualiza data/services-health.json con estado de github.
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone

ACCOUNTS = ["radelqui", "CarlosHuyghusrl"]
INVENTORY_PATH = os.path.expanduser("~/.openclaw/repos_inventory.json")
HEALTH_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "services-health.json")


def fetch_repos(account: str) -> list:
    """Fetch repos for a GitHub account using gh CLI."""
    cmd = [
        "gh", "repo", "list", account,
        "--limit", "30",
        "--json", "name,url,updatedAt,isPrivate",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"gh failed for {account}: {result.stderr.strip()}")
    return json.loads(result.stdout)


def build_inventory() -> dict:
    """Build the combined inventory from all accounts."""
    now = datetime.now(timezone.utc).isoformat()
    accounts = {}
    total = 0

    for acct in ACCOUNTS:
        repos = fetch_repos(acct)
        accounts[acct] = {"repos": repos, "count": len(repos)}
        total += len(repos)

    return {
        "timestamp": now,
        "accounts": accounts,
        "total_repos": total,
    }


def update_health(total_repos: int, error_msg: str | None = None) -> None:
    """Update services-health.json with github status."""
    now = datetime.now(timezone.utc).isoformat()

    health = {}
    if os.path.isfile(HEALTH_PATH):
        with open(HEALTH_PATH, "r") as f:
            health = json.load(f)

    if error_msg:
        health["github"] = {
            "status": "error",
            "error": error_msg,
            "last_check": now,
            "accounts": ACCOUNTS,
        }
    else:
        health["github"] = {
            "status": "ok",
            "total_repos": total_repos,
            "last_check": now,
            "accounts": ACCOUNTS,
        }

    with open(HEALTH_PATH, "w") as f:
        json.dump(health, f, indent=2)


def main() -> None:
    try:
        inventory = build_inventory()

        os.makedirs(os.path.dirname(INVENTORY_PATH), exist_ok=True)
        with open(INVENTORY_PATH, "w") as f:
            json.dump(inventory, f, indent=2)

        print(f"Inventory saved: {inventory['total_repos']} repos across {len(ACCOUNTS)} accounts")
        update_health(inventory["total_repos"])
        print(f"Health updated: {HEALTH_PATH}")

    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        update_health(0, error_msg=str(exc))
        sys.exit(1)


if __name__ == "__main__":
    main()
