# SYPNOSE v5.2 — Guia Instalacion para Claude Code

## REQUISITOS
- Ubuntu 22/24, Node.js >= 18, tmux
- Knowledge Hub (KB) en :18791
- CLIProxy en :8317

## API KB (CRITICO)
- SAVE: POST /api/save {"key":"...","value":"..."}
- READ: GET /api/read?key=...
- LIST: GET /api/list?prefix=...
- HEALTH: GET /health

## INSTALACION
1. tar xzf, cp a /opt/sypnose/
2. npm install, cp .env.example .env
3. Editar clients.json con agentes reales
4. systemctl daemon-reload, npm test (12+21)

## ARRANQUE: PROACTIVE false, systemctl start
## Verificar: Y1 mailbox, Y2 kb:ok proxy:ok

## ERRORES COMUNES
- KB: value NO data, GET NO POST para reads
- CLIProxy health: / NO /v1/models
- Paths y tmux sessions deben ser exactos
