#!/usr/bin/env python3
"""
OpenClaw Health API
Puerto 9091 (localhost only)
GET  /api/models/health      - Estado de todos los modelos con resumen
GET  /api/health             - Ping
GET  /api/services/health    - Estado de todos los servicios monitoreados
GET  /api/services/iatrader  - Detalle de servicios IATRADER + risk metrics
POST /api/agents/register    - Registrar/actualizar agente
POST /api/plans/register     - Registrar plan con tareas
PUT  /api/plans/update       - Actualizar tarea de un plan
PUT  /api/plans/close        - Cerrar plan
GET  /api/dashboard          - Vista consolidada
GET  /api/trading/health    - Estado de bases de datos IATRADER (trades, PnL, WR)
GET  /api/github/repos      - Inventario de repos GitHub
"""

import json
import os
import http.server
import socketserver
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

HOST = "127.0.0.1"
PORT = 9091
DATA_DIR = Path.home() / "openclaw/data"
HEALTH_FILE = DATA_DIR / "model-health.json"
AGENTS_FILE = DATA_DIR / "agents-registry.json"
PLANS_FILE  = DATA_DIR / "plans-registry.json"
SERVICES_HEALTH_FILE = DATA_DIR / "services-health.json"
SYNC_SCRIPT = Path.home() / "openclaw/sync_health_data.py"

# Locks for concurrent writes
_agents_lock = threading.Lock()
_plans_lock  = threading.Lock()


def _read_json(path):
    """Read a JSON file safely."""
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _write_json_atomic(path, data):
    """Write JSON atomically: write to .tmp then rename."""
    tmp = str(path) + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.rename(tmp, str(path))


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class HealthHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        print("[%s] %s" % (ts, format % args), flush=True)

    # ── Routing ──────────────────────────────────────────────

    def do_GET(self):
        if self.path == "/api/models/health":
            self._serve_health()
        elif self.path == "/api/health" or self.path == "/":
            self._serve_ping()
        elif self.path == "/api/dashboard":
            self._serve_dashboard()
        elif self.path == "/api/services/health":
            self._serve_services_health()
        elif self.path == "/api/services/iatrader":
            self._serve_services_iatrader()
        elif self.path == "/api/trading/health":
            self._serve_trading_health()
        elif self.path == "/api/github/repos":
            self._serve_github_repos()
        else:
            self._send_json(404, {"error": "Not found", "path": self.path})

    def do_POST(self):
        if self.path == "/api/agents/register":
            self._handle_agents_register()
        elif self.path == "/api/plans/register":
            self._handle_plans_register()
        else:
            self._send_json(404, {"error": "Not found", "path": self.path})

    def do_PUT(self):
        if self.path == "/api/plans/update":
            self._handle_plans_update()
        elif self.path == "/api/plans/close":
            self._handle_plans_close()
        else:
            self._send_json(404, {"error": "Not found", "path": self.path})

    # ── Body parsing ─────────────────────────────────────────

    def _read_body_json(self):
        """Read and parse JSON body. Returns (data, error_response)."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return None, (400, {"error": "Empty body"})
        raw = self.rfile.read(content_length)
        try:
            return json.loads(raw), None
        except json.JSONDecodeError as e:
            return None, (400, {"error": "Invalid JSON", "detail": str(e)})

    # ── Existing endpoints ───────────────────────────────────

    def _serve_health(self):
        if not HEALTH_FILE.exists():
            self._send_json(503, {"error": "Health data not available", "hint": "Run sync_health_data.py first"})
            return

        try:
            with open(HEALTH_FILE) as f:
                data = json.load(f)
        except Exception as e:
            self._send_json(500, {"error": "Failed to read health data", "detail": str(e)})
            return

        # Add staleness indicator
        synced_at = data.get("synced_at", "")
        try:
            dt = datetime.fromisoformat(synced_at.replace("Z", "+00:00"))
            age_seconds = (datetime.now(timezone.utc) - dt).total_seconds()
            data["data_age_seconds"] = int(age_seconds)
            data["data_fresh"] = age_seconds < 600  # fresh if < 10 min
        except Exception:
            data["data_age_seconds"] = -1
            data["data_fresh"] = False

        self._send_json(200, data)

    def _serve_ping(self):
        self._send_json(200, {
            "service": "openclaw-health-api",
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        })

    # ── POST /api/agents/register ────────────────────────────

    def _handle_agents_register(self):
        body, err = self._read_body_json()
        if err:
            self._send_json(err[0], err[1])
            return

        agent_id = body.get("agent_id")
        if not agent_id:
            self._send_json(400, {"error": "Missing required field: agent_id"})
            return

        now = _now_iso()
        agent_entry = {
            "agent_id": agent_id,
            "project": body.get("project", ""),
            "role": body.get("role", ""),
            "status": body.get("status", "active"),
            "registered_at": now,
            "last_seen": now,
        }

        with _agents_lock:
            data = _read_json(AGENTS_FILE) or {"agents": [], "updated_at": ""}
            agents = data.get("agents", [])

            # Upsert: find existing by agent_id
            found = False
            for i, a in enumerate(agents):
                if a.get("agent_id") == agent_id:
                    # Keep original registered_at, update everything else
                    agent_entry["registered_at"] = a.get("registered_at", now)
                    agents[i] = agent_entry
                    found = True
                    break

            if not found:
                agents.append(agent_entry)

            data["agents"] = agents
            data["updated_at"] = now
            _write_json_atomic(AGENTS_FILE, data)

        self._send_json(200, {"status": "ok", "agent": agent_entry})

    # ── POST /api/plans/register ─────────────────────────────

    def _handle_plans_register(self):
        body, err = self._read_body_json()
        if err:
            self._send_json(err[0], err[1])
            return

        now = _now_iso()
        plan_id = body.get("plan_id") or "plan-%d" % int(time.time())

        tasks = body.get("tasks", [])
        # Ensure each task has required fields
        for t in tasks:
            t.setdefault("task_id", 0)
            t.setdefault("title", "")
            t.setdefault("status", "pending")

        plan_entry = {
            "plan_id": plan_id,
            "agent_id": body.get("agent_id", ""),
            "project": body.get("project", ""),
            "title": body.get("title", ""),
            "status": "in_progress",
            "tasks": tasks,
            "created_at": now,
        }

        with _plans_lock:
            data = _read_json(PLANS_FILE) or {"plans": [], "updated_at": ""}
            plans = data.get("plans", [])
            plans.append(plan_entry)
            data["plans"] = plans
            data["updated_at"] = now
            _write_json_atomic(PLANS_FILE, data)

        self._send_json(200, {"status": "ok", "plan": plan_entry})

    # ── PUT /api/plans/update ────────────────────────────────

    def _handle_plans_update(self):
        body, err = self._read_body_json()
        if err:
            self._send_json(err[0], err[1])
            return

        plan_id = body.get("plan_id")
        task_id = body.get("task_id")
        if not plan_id or task_id is None:
            self._send_json(400, {"error": "Missing required fields: plan_id, task_id"})
            return

        now = _now_iso()

        with _plans_lock:
            data = _read_json(PLANS_FILE) or {"plans": [], "updated_at": ""}
            plans = data.get("plans", [])

            plan_found = False
            task_found = False
            for plan in plans:
                if plan.get("plan_id") == plan_id:
                    plan_found = True
                    for task in plan.get("tasks", []):
                        if task.get("task_id") == task_id:
                            task_found = True
                            task["status"] = body.get("status", task.get("status"))
                            task["evidence"] = body.get("evidence", "")
                            task["updated_at"] = now
                            break
                    break

            if not plan_found:
                self._send_json(404, {"error": "Plan not found", "plan_id": plan_id})
                return
            if not task_found:
                self._send_json(404, {"error": "Task not found", "plan_id": plan_id, "task_id": task_id})
                return

            data["updated_at"] = now
            _write_json_atomic(PLANS_FILE, data)

        self._send_json(200, {"status": "ok", "plan_id": plan_id, "task_id": task_id, "updated_at": now})

    # ── PUT /api/plans/close ─────────────────────────────────

    def _handle_plans_close(self):
        body, err = self._read_body_json()
        if err:
            self._send_json(err[0], err[1])
            return

        plan_id = body.get("plan_id")
        if not plan_id:
            self._send_json(400, {"error": "Missing required field: plan_id"})
            return

        now = _now_iso()

        with _plans_lock:
            data = _read_json(PLANS_FILE) or {"plans": [], "updated_at": ""}
            plans = data.get("plans", [])

            found = False
            for plan in plans:
                if plan.get("plan_id") == plan_id:
                    found = True
                    plan["status"] = body.get("status", "completed")
                    plan["summary"] = body.get("summary", "")
                    plan["closed_at"] = now
                    break

            if not found:
                self._send_json(404, {"error": "Plan not found", "plan_id": plan_id})
                return

            data["updated_at"] = now
            _write_json_atomic(PLANS_FILE, data)

        self._send_json(200, {"status": "ok", "plan_id": plan_id, "closed_at": now})

    # ── GET /api/services/health ───────────────────────────────

    def _serve_services_health(self):
        if not SERVICES_HEALTH_FILE.exists():
            self._send_json(503, {"error": "Services health data not available",
                                   "hint": "services-health.json not found"})
            return

        try:
            with open(SERVICES_HEALTH_FILE) as f:
                services = json.load(f)
        except Exception as e:
            self._send_json(500, {"error": "Failed to read services health", "detail": str(e)})
            return

        # Build summary
        total = len(services)
        healthy = 0
        down = 0
        unknown = 0
        for svc_data in services.values():
            st = svc_data.get("status", "unknown")
            if st == "ok":
                healthy += 1
            elif st == "down":
                down += 1
            else:
                unknown += 1

        # Data age from the most recent last_check
        age_seconds = -1
        try:
            checks = [svc_data.get("last_check", "") for svc_data in services.values() if svc_data.get("last_check")]
            if checks:
                latest = max(checks)
                dt = datetime.fromisoformat(latest.replace("Z", "+00:00"))
                age_seconds = int((datetime.now(timezone.utc) - dt).total_seconds())
        except Exception:
            pass

        response = {
            "summary": {"total": total, "healthy": healthy, "down": down, "unknown": unknown},
            "services": services,
            "data_age_seconds": age_seconds,
        }
        self._send_json(200, response)

    # ── GET /api/services/iatrader ─────────────────────────────

    def _serve_services_iatrader(self):
        if not SERVICES_HEALTH_FILE.exists():
            self._send_json(503, {"error": "Services health data not available",
                                   "hint": "services-health.json not found"})
            return

        try:
            with open(SERVICES_HEALTH_FILE) as f:
                services = json.load(f)
        except Exception as e:
            self._send_json(500, {"error": "Failed to read services health", "detail": str(e)})
            return

        # Extract only iatrader-critical and iatrader groups
        iatrader_services = {}
        for name, svc_data in services.items():
            group = svc_data.get("group", "")
            if group in ("iatrader-critical", "iatrader"):
                iatrader_services[name] = svc_data

        total = len(iatrader_services)
        healthy = sum(1 for s in iatrader_services.values() if s.get("status") == "ok")
        down = sum(1 for s in iatrader_services.values() if s.get("status") == "down")

        # Enrich risk_guardian with extra metrics if available
        risk_metrics = {}
        rg = iatrader_services.get("risk_guardian", {})
        if rg.get("status") == "ok":
            # Try to fetch live risk metrics from risk_guardian API
            try:
                import urllib.request
                req = urllib.request.Request("http://127.0.0.1:8103/api/status", method="GET")
                req.add_header("Accept", "application/json")
                with urllib.request.urlopen(req, timeout=3) as resp:
                    rg_data = json.loads(resp.read())
                    risk_metrics["circuit_breaker"] = rg_data.get("circuit_breaker", rg_data.get("circuit_breaker_active"))
                    risk_metrics["daily_dd_pct"] = rg_data.get("daily_dd_pct", rg_data.get("daily_drawdown_pct"))
                    risk_metrics["max_dd_pct"] = rg_data.get("max_dd_pct", rg_data.get("max_drawdown_pct"))
                    risk_metrics["open_positions"] = rg_data.get("open_positions")
                    # Remove None values
                    risk_metrics = {k: v for k, v in risk_metrics.items() if v is not None}
            except Exception:
                risk_metrics = {"note": "risk_guardian reachable but metrics fetch failed or not available"}

        response = {
            "summary": {"total": total, "healthy": healthy, "down": down},
            "services": iatrader_services,
        }
        if risk_metrics:
            response["risk_metrics"] = risk_metrics

        self._send_json(200, response)

    # ── GET /api/trading/health ──────────────────────────────

    def _serve_trading_health(self):
        trading_file = DATA_DIR / "trading-health.json"
        if not trading_file.exists():
            self._send_json(503, {"error": "Trading health data not available",
                                   "hint": "Run db_monitor.py first"})
            return
        try:
            with open(trading_file) as f:
                data = json.load(f)
        except Exception as e:
            self._send_json(500, {"error": "Failed to read trading health", "detail": str(e)})
            return

        # Add data age
        ts = data.get("timestamp", "")
        try:
            dt = datetime.fromisoformat(ts)
            age_seconds = int((datetime.now(timezone.utc) - dt).total_seconds())
            data["data_age_seconds"] = age_seconds
        except Exception:
            data["data_age_seconds"] = -1

        self._send_json(200, data)

    # ── GET /api/github/repos ────────────────────────────────

    def _serve_github_repos(self):
        repos_file = Path.home() / ".openclaw" / "repos_inventory.json"
        if not repos_file.exists():
            self._send_json(503, {"error": "Repos inventory not available",
                                   "hint": "Run repos_inventory.py first"})
            return
        try:
            with open(repos_file) as f:
                data = json.load(f)
        except Exception as e:
            self._send_json(500, {"error": "Failed to read repos inventory", "detail": str(e)})
            return

        # Add data age
        ts = data.get("timestamp", "")
        try:
            dt = datetime.fromisoformat(ts)
            age_seconds = int((datetime.now(timezone.utc) - dt).total_seconds())
            data["data_age_seconds"] = age_seconds
        except Exception:
            data["data_age_seconds"] = -1

        self._send_json(200, data)

    # ── GET /api/dashboard ───────────────────────────────────

    def _serve_dashboard(self):
        # Agents
        agents_data = _read_json(AGENTS_FILE) or {"agents": []}
        agents_list = agents_data.get("agents", [])
        active_count = sum(1 for a in agents_list if a.get("status") == "active")
        idle_count = sum(1 for a in agents_list if a.get("status") == "idle")

        # Plans
        plans_data = _read_json(PLANS_FILE) or {"plans": []}
        plans_list = plans_data.get("plans", [])
        in_progress = sum(1 for p in plans_list if p.get("status") == "in_progress")
        completed = sum(1 for p in plans_list if p.get("status") == "completed")
        recent = plans_list[-5:] if len(plans_list) > 5 else plans_list

        # Models
        models_data = _read_json(HEALTH_FILE) or {}
        models_dict = models_data.get("models", {})
        summary = models_data.get("summary", {})
        total_models = summary.get("total", len(models_dict))
        healthy = summary.get("healthy", 0)
        degraded = summary.get("degraded", 0)
        down = summary.get("down", 0)

        dashboard = {
            "agents": {
                "total": len(agents_list),
                "active": active_count,
                "idle": idle_count,
                "list": agents_list,
            },
            "plans": {
                "total": len(plans_list),
                "in_progress": in_progress,
                "completed": completed,
                "recent": recent,
            },
            "models": {
                "total": total_models,
                "healthy": healthy,
                "degraded": degraded,
                "down": down,
            },
            "timestamp": _now_iso(),
        }

        self._send_json(200, dashboard)

    # ── Response helper ──────────────────────────────────────

    def _send_json(self, code, data):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    server = ThreadedHTTPServer((HOST, PORT), HealthHandler)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print("[%s] OpenClaw Health API started on %s:%d" % (ts, HOST, PORT), flush=True)
    print("  GET  /api/models/health    -> model status + summary", flush=True)
    print("  GET  /api/health           -> ping", flush=True)
    print("  POST /api/agents/register  -> register/update agent", flush=True)
    print("  POST /api/plans/register   -> register plan", flush=True)
    print("  PUT  /api/plans/update     -> update task in plan", flush=True)
    print("  PUT  /api/plans/close      -> close plan", flush=True)
    print("  GET  /api/services/health  -> all services status + summary", flush=True)
    print("  GET  /api/services/iatrader -> iatrader services + risk metrics", flush=True)
    print("  GET  /api/trading/health   -> IATRADER DB stats (trades, PnL)", flush=True)
    print("  GET  /api/github/repos     -> GitHub repos inventory", flush=True)
    print("  GET  /api/dashboard        -> consolidated view", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.", flush=True)
        server.shutdown()


if __name__ == "__main__":
    main()
