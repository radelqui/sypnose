#!/usr/bin/env python3
"""OpenClaw Daily Report — Genera y envia reporte diario a Telegram."""

import sys
import os
import json
from datetime import datetime, timezone
from html import escape as html_escape

sys.path.insert(0, '/home/<USUARIO>/openclaw')
from telegram_utils import send_telegram

DATA_DIR = '/home/<USUARIO>/openclaw/data'


def load_json(filename):
    """Carga un JSON del directorio data. Retorna None si no existe."""
    path = os.path.join(DATA_DIR, filename)
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[WARN] {filename} no encontrado, skip.")
        return None
    except json.JSONDecodeError as e:
        print(f"[ERROR] {filename} JSON invalido: {e}")
        return None


def build_report():
    """Construye el mensaje del reporte diario."""
    now = datetime.now(timezone.utc)
    fecha = now.strftime('%d-%b-%Y').upper()
    today_str = now.strftime('%Y-%m-%d')

    lines = []
    lines.append(f"<b>REPORTE DIARIO OpenClaw -- {fecha}</b>")
    lines.append("")

    # --- ARQUITECTOS ---
    agents_data = load_json('agents-registry.json')
    if agents_data and 'agents' in agents_data:
        agents = agents_data['agents']
        active = [a for a in agents if a.get('status') == 'active']
        lines.append(f"<b>ARQUITECTOS:</b> {len(active)} activos / {len(agents)} total")
        for a in agents:
            status_icon = "[OK]" if a.get('status') == 'active' else "[--]"
            lines.append(f"  {status_icon} {a.get('agent_id', '?')}: {a.get('project', '?')} ({a.get('status', '?')})")
    else:
        lines.append("<b>ARQUITECTOS:</b> Sin datos")
    lines.append("")

    # --- PLANES ---
    plans_data = load_json('plans-registry.json')
    completed_today = []
    in_progress = []
    if plans_data and 'plans' in plans_data:
        for p in plans_data['plans']:
            status = p.get('status', '')
            completed_at = p.get('completed_at', '')
            if status == 'completed' and completed_at and completed_at.startswith(today_str):
                completed_today.append(p)
            elif status == 'in_progress':
                in_progress.append(p)

    lines.append("<b>COMPLETADO HOY:</b>")
    if completed_today:
        for p in completed_today:
            lines.append(f"  - {p.get('title', p.get('plan_id', '?'))}")
    else:
        lines.append("  Ninguno")
    lines.append("")

    lines.append("<b>EN PROGRESO:</b>")
    if in_progress:
        for p in in_progress:
            lines.append(f"  - {p.get('title', p.get('plan_id', '?'))}")
    else:
        lines.append("  Ninguno")
    lines.append("")

    # --- MODELOS ---
    health_data = load_json('model-health.json')
    if health_data and 'summary' in health_data:
        s = health_data['summary']
        total = s.get('total', 0)
        healthy = s.get('healthy', 0)
        degraded = s.get('degraded', 0)
        down = s.get('down', 0)
        lines.append(f"<b>MODELOS:</b> {healthy}/{total} healthy")
        if degraded > 0 or down > 0:
            models = health_data.get('models', {})
            for name, info in models.items():
                st = info.get('status', 'ok')
                if st != 'ok':
                    err = info.get('last_error', 'unknown')
                    fails = info.get('consecutive_failures', 0)
                    lines.append(f"  [!!] {name}: {st} ({err}, {fails} failures)")
    else:
        lines.append("<b>MODELOS:</b> Sin datos")
    lines.append("")

    # --- SERVICIOS ---
    services_data = load_json('services-health.json')
    if services_data:
        total_svc = len(services_data)
        healthy_svc = sum(1 for s in services_data.values() if s.get('status') == 'ok')
        down_svcs = {name: info for name, info in services_data.items() if info.get('status') != 'ok'}
        lines.append(f"<b>SERVICIOS:</b> {healthy_svc}/{total_svc} healthy")
        lines.append("")

        # IATRADER detail
        iatrader_keys = {k: v for k, v in services_data.items()
                         if v.get('group', '').startswith('iatrader')}
        if iatrader_keys:
            ia_active = sum(1 for v in iatrader_keys.values() if v.get('status') == 'ok')
            ia_total = len(iatrader_keys)
            mt5_real = services_data.get('mt5_real', {})
            mt5_icon = '\u2705' if mt5_real.get('status') == 'ok' else '\u274c'
            rg = services_data.get('risk_guardian', {})
            rg_icon = '\u2705' if rg.get('status') == 'ok' else '\u274c'
            pos_mon = services_data.get('position_monitor', {})
            pos_detail = pos_mon.get('last_detail', '')
            lines.append("<b>IATRADER:</b>")
            lines.append(f"  - Agentes: {ia_active}/{ia_total} activos")
            lines.append(f"  - MT5 Real: {mt5_icon}")
            lines.append(f"  - RiskGuardian: {rg_icon}")
            if pos_mon.get('status') == 'ok' and 'position' in pos_detail.lower():
                lines.append(f"  - Posiciones: {pos_detail}")
            lines.append("")

        # Down services
        if down_svcs:
            lines.append("<b>CAIDOS:</b>")
            for name, info in down_svcs.items():
                detail = html_escape(info.get('last_detail', 'unknown'))
                group = info.get('group', '?')
                fails = info.get('consecutive_failures', 0)
                lines.append(f"  [!!] {name} ({group}) — {detail} [x{fails}]")
        else:
            lines.append("Sin servicios caidos")
    else:
        lines.append("<b>SERVICIOS:</b> Sin datos (services-health.json no encontrado)")
    lines.append("")

    # --- TRADING ---
    trading_data = load_json('trading-health.json')
    if trading_data and 'databases' in trading_data:
        lines.append("")
        lines.append("<b>TRADING:</b>")
        dbs = trading_data['databases']
        for db_name in ['main', 'demo', 'real']:
            db = dbs.get(db_name, {})
            if db.get('status') == 'ok':
                trades = db.get('trades', 'N/A')
                pnl = db.get('pnl', 0)
                wr = db.get('win_rate', 'N/A')
                open_t = db.get('open', 0)
                pnl_str = f"${pnl:.2f}" if isinstance(pnl, (int, float)) else str(pnl)
                lines.append(f"  {db_name.upper()}: {trades} trades, PnL: {pnl_str}, WR: {wr}, Open: {open_t}")
            else:
                err = db.get('error', 'unknown')
                lines.append(f"  {db_name.upper()}: {html_escape(str(err))}")

    # --- GITHUB ---
    repos_data = load_json('../.openclaw/repos_inventory.json')
    if repos_data is None:
        # Try absolute path
        try:
            with open(os.path.expanduser('~/.openclaw/repos_inventory.json')) as f:
                repos_data = json.load(f)
        except Exception:
            repos_data = None

    if repos_data and 'accounts' in repos_data:
        lines.append("")
        lines.append("<b>GITHUB:</b>")
        total_repos = 0
        for account_name, account_data in repos_data['accounts'].items():
            repos = account_data.get('repos', [])
            total_repos += len(repos)
            lines.append(f"  {account_name}: {len(repos)} repos")
        lines.append(f"  Total: {total_repos} repos")

    # --- PROYECTOS ---
    project_data = load_json('project-index.json')
    if project_data:
        projects = project_data.get('projects', [])
        lines.append(f"<b>PROYECTOS:</b> {len(projects)} indexados")
    else:
        lines.append("<b>PROYECTOS:</b> project-index.json no disponible")

    return '\n'.join(lines)


def main():
    print(f"[{datetime.now(timezone.utc).isoformat()}] Generando reporte diario OpenClaw...")
    report = build_report()
    print("--- REPORTE ---")
    print(report)
    print("--- FIN REPORTE ---")
    result = send_telegram(report)
    if result and result.get('ok'):
        print("[OK] Reporte enviado a Telegram.")
    else:
        print(f"[ERROR] Fallo al enviar: {result}")


if __name__ == '__main__':
    main()
