#!/usr/bin/env python3
"""IATRADER database monitor — read-only health check.

Scans the three IATRADER SQLite databases and writes a summary to
data/trading-health.json.  Sends Telegram alerts for critical conditions.
"""

import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone

from telegram_utils import send_telegram, escape_html

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATABASES = {
    "main": "/home/gestoria/IATRADER/v2/data/iatrader2.db",
    "demo": "/home/gestoria/IATRADER/v2/data/iatrader2_demo.db",
    "real": "/home/gestoria/IATRADER/v2/data/iatrader2_real.db",
}

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "trading-health.json")

# Alert thresholds
INACTIVITY_HOURS = 48
DAILY_PNL_ALERT_USD = -500

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _connect_ro(path: str) -> sqlite3.Connection:
    """Open a read-only connection (safe with WAL)."""
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone()
    return row is not None


def _query_one(conn: sqlite3.Connection, sql: str, params=()):
    """Execute *sql* and return the first row, or None."""
    try:
        return conn.execute(sql, params).fetchone()
    except sqlite3.OperationalError:
        return None


# ---------------------------------------------------------------------------
# Per-database analysis
# ---------------------------------------------------------------------------

def analyse_db(path: str) -> dict:
    """Return health metrics for a single database."""
    if not os.path.exists(path):
        return {"status": "missing"}

    try:
        conn = _connect_ro(path)
    except sqlite3.OperationalError as exc:
        return {"status": f"error: {exc}"}

    info: dict = {"status": "ok"}

    # --- trades ---
    if _table_exists(conn, "trades"):
        row = _query_one(conn, """
            SELECT
                COUNT(*)                                          AS total,
                SUM(CASE WHEN profit IS NOT NULL THEN profit ELSE 0 END) AS pnl,
                SUM(CASE WHEN profit IS NULL THEN 1 ELSE 0 END)  AS open,
                SUM(CASE WHEN profit > 0  THEN 1 ELSE 0 END)     AS wins,
                SUM(CASE WHEN profit IS NOT NULL THEN 1 ELSE 0 END) AS closed,
                MAX(timestamp)                                    AS last_trade
            FROM trades
        """)
        if row:
            closed = row["closed"] or 0
            wins = row["wins"] or 0
            info["trades"] = row["total"] or 0
            info["pnl"] = round(row["pnl"] or 0, 2)
            info["open"] = row["open"] or 0
            info["win_rate"] = f"{(wins / closed * 100):.1f}%" if closed > 0 else "N/A"
            info["last_trade"] = row["last_trade"] or "N/A"

        # Today's PnL (UTC)
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        day_row = _query_one(conn, """
            SELECT COALESCE(SUM(profit), 0) AS day_pnl
            FROM trades
            WHERE profit IS NOT NULL AND close_time >= ?
        """, (today_str,))
        info["today_pnl"] = round(day_row["day_pnl"], 2) if day_row else 0
    else:
        for k in ("trades", "pnl", "open", "win_rate", "last_trade", "today_pnl"):
            info[k] = "N/A"

    # --- claude_decisions ---
    if _table_exists(conn, "claude_decisions"):
        row = _query_one(conn, "SELECT COUNT(*) AS cnt, MAX(timestamp) AS last_ts FROM claude_decisions")
        info["decisions"] = row["cnt"] if row else 0
        info["last_decision"] = row["last_ts"] if row else "N/A"
    else:
        info["decisions"] = "N/A"
        info["last_decision"] = "N/A"

    # --- rejected_signals ---
    if _table_exists(conn, "rejected_signals"):
        row = _query_one(conn, "SELECT COUNT(*) AS cnt FROM rejected_signals")
        info["rejected"] = row["cnt"] if row else 0
    else:
        info["rejected"] = "N/A"

    conn.close()
    return info


# ---------------------------------------------------------------------------
# Alert logic
# ---------------------------------------------------------------------------

def check_alerts(databases: dict) -> list[str]:
    """Return a list of human-readable alert strings."""
    alerts: list[str] = []
    now = datetime.now(timezone.utc)
    weekday = now.weekday()  # 0=Mon … 4=Fri

    real = databases.get("real", {})

    # Alert 1: real DB inactivity (weekdays only)
    if weekday <= 4 and real.get("status") == "ok":
        last_trade = real.get("last_trade")
        if last_trade and last_trade != "N/A":
            try:
                lt_dt = datetime.fromisoformat(last_trade).replace(tzinfo=timezone.utc)
                if (now - lt_dt) > timedelta(hours=INACTIVITY_HOURS):
                    alerts.append(
                        f"REAL sin trades en >{INACTIVITY_HOURS}h (último: {last_trade})"
                    )
            except (ValueError, TypeError):
                pass
        elif real.get("trades", 0) == 0 or real.get("trades") == "N/A":
            alerts.append("REAL: 0 trades registrados")

    # Alert 2: daily PnL on real
    if real.get("status") == "ok" and isinstance(real.get("today_pnl"), (int, float)):
        if real["today_pnl"] < DAILY_PNL_ALERT_USD:
            alerts.append(
                f"REAL PnL hoy: ${real['today_pnl']:.2f} (umbral: ${DAILY_PNL_ALERT_USD})"
            )

    return alerts


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    results: dict = {}
    for label, path in DATABASES.items():
        results[label] = analyse_db(path)

    alerts = check_alerts(results)

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "databases": results,
        "alerts": alerts,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"OK — wrote {OUTPUT_FILE}")
    if alerts:
        msg_lines = [f"<b>IATRADER DB Monitor</b>"]
        for a in alerts:
            msg_lines.append(f"  - {escape_html(a)}")
        send_telegram("\n".join(msg_lines))
        print(f"Alerts sent ({len(alerts)}): {alerts}")
    else:
        print("No alerts.")


if __name__ == "__main__":
    main()
