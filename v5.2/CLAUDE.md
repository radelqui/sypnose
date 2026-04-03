# SYPNOSE — REGLAS OBLIGATORIAS

## KB API (:18791) — CRITICO
SAVE: POST /api/save {"key":"...", "value":"..."}
READ: GET /api/read?key=...
LIST: GET /api/list?prefix=...
HEALTH: GET /health
Campo VALUE no DATA. GET no POST para reads.

## CLIProxy (:8317)
Health: GET localhost:8317/ (NO /v1/models)

## Paths: VERIFICAR con ls antes de usar
## tmux: VERIFICAR con tmux list-sessions
## Systemd: User=gestoria, NUNCA root
## Tests: 12/12 smoke + 21/21 full
## BORIS: sin evidencia, no se ha hecho

## Flujo: SM planifica, Code ejecuta con plan aprobado
