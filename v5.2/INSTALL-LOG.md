# INSTALL-LOG — Sypnose v5.2.0
# Instalado: 2026-04-03 por SM (Opus 4.6) con Carlos supervisando
# Servidor: Contabo 217.216.48.91:2024 (gestoria)

---

## FASE 1: Instalacion base

### 1.1 Upload y descompresion
- Origen: C:\Carlos\Sypnose_5.2\sypnose-v52.tar.gz (32KB)
- scp -P 2024 al servidor -> /tmp/
- tar xzf en /tmp/sypnose-v52/
- 10 directorios, 30 archivos, ~1,900 lineas de codigo

### 1.2 Copia a /opt/sypnose/
- sudo mkdir -p /opt/sypnose
- sudo cp -r + chown gestoria:gestoria
- chmod +x bin/ scripts/
- chmod 600 .env (protegido)

### 1.3 Dependencias
- npm install -> 4 packages, 0 vulnerabilities
- unica dependencia: node-fetch ^2.7.0

### 1.4 Directorios de log
- /var/log/sypnose/audit/ + events/ (gestoria:gestoria)

### 1.5 Systemd
- sypnose-coordinator.service (MemoryMax=2G, RestartSec=10)
- sypnose-sse.service (RestartSec=5, After=coordinator)
- daemon-reload

### 1.6 Crontab
- 0 3 * * * kb-janitor.js (limpieza KB diaria)
- 30 3 * * * autodream-cli.js (consolidacion memoria)

### 1.7 Configuracion .env
- KB_API=http://localhost:18791/api
- PROXY_URL=http://localhost:8317/v1/chat/completions
- ANTHROPIC_API_KEY=placeholder (no se usa, todo via CLIProxy)
- WEBHOOK_TOKEN=generado openssl rand -hex 16
- TRACE_SALT=generado openssl rand -hex 8
- SSE_PORT=18795

### 1.8 flags.json
- PROACTIVE: false (Carlos pidio)
- HEALTH_MONITORING: true
- MEMORY_DREAM: true (min 24h, min 5 sessions)
- WEBHOOK: true
- SESSION_RECORDING: true
- COST_ALERTS: true (/dia)

---

## FASE 2: Arranque y correccion de bugs

### 2.1 Arranque daemons
- sudo systemctl enable --now sypnose-coordinator sypnose-sse
- Ambos active

### 2.2 clients.json — 6 agentes reales
El paquete original traia 2 clientes con paths incorrectos. Corregido a:

| id | tmux_session | project_dir | estado |
|---|---|---|---|
| gestoriard | gestion-contadoresrd | ~/gestion-contadoresrd | git:main, alive |
| dgii | dgii | ~/gestion-contadoresrd | git:main, alive |
| iatrader-rust | iatrader-rust | ~/IATRADER-RUST | git:main, alive |
| facturaia | FacturaIA | ~/eas-builds/FacturaScannerApp | git:main, alive |
| seguridad | seguridad-server | ~/seguridad-server | git:master, alive |
| jobhunter | jobhunter | ~/jobhunter | git:?, alive (no es repo) |

### 2.3 Bugs KB API (el mas critico)
El auditor creo funciones KB asumiendo una API diferente a nuestro Knowledge Hub.

| Funcion | Bug | Fix |
|---|---|---|
| kbSave (loop.js:91) | Campo "data" | Cambiado a "value" |
| kbRead (loop.js:96) | POST con body | GET con query params (?key=X) |
| kbRead (loop.js:103) | Lee response.data | Lee response.entry.value |
| kbList (loop.js:98) | POST con prefix | GET paginado + filtro client-side por key prefix |
| kbDelete (loop.js:108) | Campo data:null | Campo value:null |

### 2.4 Bugs proxy health
| Archivo | Bug | Fix |
|---|---|---|
| core/loop.js:593 | Health check /v1/models (requiere auth, 401) | Cambiado a / (200 sin auth) |

### 2.5 Bugs verify script
| Bug | Fix |
|---|---|
| Write usaba data | Cambiado a value |
| Read usaba POST | GET con query |
| Read leia .data | Lee .entry.value |
| List usaba POST+prefix | GET con ?category= |
| Proxy check /v1/models | Cambiado a / |

### 2.6 Bugs MCP server
| Bug | Fix |
|---|---|
| Schema kb_save: data (object) | Cambiado a value (string) |
| Handler: args.data | args.value |
| Response: { data: ... } | { value: ... } |

### 2.7 Otros
- loop.js.bak-1846 (backup del auditor) eliminado
- /tmp/ limpiado

---

## ESTADO FINAL VERIFICADO

### Services
| Service | PID | Puerto | Estado |
|---|---|---|---|
| sypnose-coordinator | 67563 | - | active, 6/6 probes |
| sypnose-sse | 67564 | :18795 | active, 0 clients |
| sypnose-hub (pre-existente) | 1609664 | :18791 | active |
| sypnose-channel (pre-existente) | - | - | active |
| sypnose-agent (pre-existente) | 2988670 | :3002 | active |

### Tests
- Smoke: 12/12 ALL GREEN
- Full: 21/21 ALL GREEN
- KB integrity: health OK, write/read OK, SypnoseProxy OK

### KB Namespaces
- task: 450 entries
- notification: 221 entries
- report: 115 entries
- config: 118 entries
- Total: 1867 entries

### MCP Tools
- kb_save (key, value)
- kb_read (key)
- kb_list (prefix)
- send_task (client_id, description)
- get_status

---

## TOTAL ERRORES AUDITOR: 15

| # | Archivo | Error | Severidad |
|---|---|---|---|
| 1 | config/clients.json | Path /home/gestoria/gestoriard no existe | CRITICO |
| 2 | config/clients.json | Solo 2 de 6 clientes | ALTO |
| 3 | config/clients.json | IATRADER Python (obsoleto) | ALTO |
| 4 | core/loop.js kbSave | Usa "data" en vez de "value" | CRITICO |
| 5 | core/loop.js kbRead | POST en vez de GET | CRITICO |
| 6 | core/loop.js kbRead | Lee .data en vez de .entry.value | CRITICO |
| 7 | core/loop.js kbList | POST con prefix (KB no soporta) | CRITICO |
| 8 | core/loop.js kbDelete | Usa "data" en vez de "value" | ALTO |
| 9 | core/loop.js health | /v1/models requiere auth | MEDIO |
| 10 | scripts/verify-kb-integrity.sh | Mismos bugs de API | MEDIO |
| 11 | mcp/server.js schema | data en vez de value | ALTO |
| 12 | mcp/server.js handler | args.data en vez de args.value | ALTO |
| 13 | mcp/server.js response | {data:} en vez de {value:} | MEDIO |
| 14 | DISPATCH.md | "13/13 tests" (son 12+21) | BAJO |
| 15 | DISPATCH.md | "SypnoseProxy" (es CLIProxy) | BAJO |

Causa raiz: el auditor no tenia acceso al Knowledge Hub real.
Construyo las funciones KB asumiendo una API diferente.

---

## GUIA: CREAR NUEVO AGENTE SYPNOSE

### Paso 1: Crear sesion tmux
tmux new-session -d -s mi-proyecto -c /home/gestoria/mi-proyecto

### Paso 2: Registrar en scripts de arranque
Editar ~/scripts/start-tmux-sessions.sh:
  SESSIONS[mi-proyecto]="/home/gestoria/mi-proyecto"
Editar ~/scripts/start-architects.sh:
  PROJECTS[mi-proyecto]="/c/Users/carlo/mi-proyecto"

### Paso 3: Configurar proyecto
mkdir -p .claude .brain
Crear: .claude/settings.local.json (bypassPermissions + MCPs)
Crear: CLAUDE.md (Boris + comunicacion KB)
Crear: .brain/task.md + session-state.md + history.md + done-registry.md

### Paso 4: Registrar en Sypnose v5.2
Editar /opt/sypnose/config/clients.json (anadir entrada)
sudo systemctl restart sypnose-coordinator
Verificar: journalctl | grep mi-proyecto -> probe alive

### Paso 5: Instalar Boris hooks
Copiar de proyecto existente: .claude/hooks/ + .claude/rules/

### Paso 6: Arrancar Claude
tmux send-keys -t mi-proyecto "claude --dangerously-skip-permissions" Enter

### Archivos minimos por proyecto
mi-proyecto/
  .claude/settings.local.json
  .claude/hooks/ (Boris)
  .claude/rules/ (Boris)
  .brain/task.md + session-state.md + history.md + done-registry.md
  CLAUDE.md

---

## PENDIENTE (no ejecutado)
- Logrotate para /var/log/sypnose/events/stream.jsonl
- jobhunter: decidir si quitar de clients.json o crear repo
- Documentar instalacion completa para servidor limpio (Fase 2)
