# SYPNOSE v5.2 — MANUAL DE INSTALACION

Documento vivo. Se actualiza con cada fase completada.
Cualquier Claude Code puede seguir este manual para instalar Sypnose v5.2 en un servidor.

---

## SECCION 1: Que es SYPNOSE v5.2

Sistema de orquestacion multi-agente para Claude Code. 30 archivos, ~1,900 lineas.
Basado en analisis del codigo fuente de Claude Code (512K lineas TypeScript).

### 3 pilares
1. **Memoria (KB)**: Knowledge Hub como bus de comunicacion entre agentes
2. **Verificacion (Boris)**: Sin evidencia real, el trabajo no existe
3. **Coordinacion (Coordinator)**: Loop cada 30s que monitorea agentes, costos, salud

### Arquitectura

```
                    ┌─────────────────┐
                    │   SM (Windows)  │
                    │  Planifica,     │
                    │  coordina       │
                    └───────┬─────────┘
                            │ kb_save task + tmux send
                            v
┌──────────┐  ┌─────────────────────────────┐  ┌──────────┐
│ CLIProxy │  │     Knowledge Hub (:18791)  │  │ SSE Hub  │
│  (:8317) │  │  SQLite + REST API          │  │ (:18795) │
│ 42 models│  │  Bus de comunicacion        │  │ Events   │
└──────────┘  └──────────┬──────────────────┘  └──────────┘
                         │
              ┌──────────┼──────────┐
              v          v          v
         ┌────────┐ ┌────────┐ ┌────────┐
         │Agent 1 │ │Agent 2 │ │Agent N │
         │(tmux)  │ │(tmux)  │ │(tmux)  │
         └────────┘ └────────┘ └────────┘
```

### 12 sistemas implementados
- AgentLoop con 7 yields (mailbox, health, probes, tasks, telemetry, budgets, sleep)
- Memory 3 capas (index, topics, dream)
- Compresion 5 capas con taint tracking
- Multi-agente A2A
- Policy engine declarativo
- Task state machine (10 estados)
- Error budget + rate limiter
- Fingerprinting HMAC
- Cache break tracking
- Cost tracking por agente
- Audit log rotado
- SSE streaming

### Componentes del paquete

| Archivo | Lineas | Funcion |
|---|---|---|
| core/loop.js | 789 | Motor principal — 7 yields, KB API, health checks |
| core/compressor.js | 155 | 5 capas compresion + taint |
| lib/memory.js | 207 | 3 capas memoria + autoDream |
| lib/taint.js | 58 | Formal taint engine |
| lib/task-state.js | 61 | State machine 10 estados |
| lib/policy-engine.js | 44 | Politicas declarativas |
| lib/executor.js | 28 | Abstract executor |
| lib/telemetry.js | 29 | Phase telemetry |
| lib/heartbeat.js | 20 | Heartbeat check/send |
| lib/cache-tracker.js | 25 | Cache break vectors |
| lib/tool-registry.js | - | Tool risk classification |
| lib/commands.js | - | CLI commands (status, compact, budget, abort) |
| lib/claude-md-loader.js | - | CLAUDE.md parser |
| mcp/server.js | 45 | MCP server (5 tools) |
| server/sse-server.js | 95 | SSE + webhooks + flag toggle |
| bin/start.js | 10 | Entry point |
| config/clients.json | - | Agentes registrados |
| flags.json | - | Feature flags |
| scripts/kb-janitor.js | - | Limpieza KB (cron 3AM) |
| scripts/autodream-cli.js | - | Consolidacion memoria (cron 3:30AM) |
| scripts/kb-dashboard.js | - | Dashboard namespaces |
| scripts/verify-kb-integrity.sh | - | Verificacion KB |
| scripts/install.sh | - | Instalador automatico |

---

## SECCION 2: Requisitos previos

| Componente | Puerto | Verificacion | Obligatorio |
|---|---|---|---|
| Ubuntu 22/24 LTS | - | lsb_release -a | SI |
| Node.js >= 18 | - | node --version | SI |
| tmux | - | which tmux | SI |
| Git | - | git --version | SI |
| Knowledge Hub (KB) | :18791 | curl -s localhost:18791/health | SI |
| CLIProxy | :8317 | curl -s localhost:8317/ | SI |
| SSE Hub | :8095 | curl -s localhost:8095/health | Para comunicacion live |
| OpenClaw | :18790 | curl -s localhost:18790/health | Para supervision 24/7 |
| Boris v6.2 | - | ls .claude/hooks/ en cada proyecto | SI |

### Script de verificacion de requisitos

```bash
#!/bin/bash
echo "=== VERIFICACION REQUISITOS SYPNOSE v5.2 ==="
FAIL=0

check() { if $2 >/dev/null 2>&1; then echo "  OK: $1"; else echo "  FALTA: $1"; FAIL=1; fi }

check "Node.js >= 18" "node --version"
check "tmux" "which tmux"
check "git" "git --version"
check "KB :18791" "curl -sf localhost:18791/health"
check "CLIProxy :8317" "curl -sf localhost:8317/"

[ $FAIL -eq 1 ] && echo "PARAR: faltan requisitos" && exit 1
echo "TODOS LOS REQUISITOS OK"
```

---

## SECCION 3: Lo que diseno el auditor

El auditor externo analizo 512K lineas del codigo fuente de Claude Code y diseno
85 mejoras para la orquestacion multi-agente. Creo un paquete de 23 archivos
entregado como sypnose-v52.tar.gz (32KB comprimido).

**Problema critico**: el auditor NO tenia acceso al servidor real cuando diseno el paquete.
Construyo las funciones KB asumiendo una API diferente a la del Knowledge Hub real.
Esto causo 15 errores que se descubrieron y corrigieron durante la instalacion.

---

## SECCION 4: Los 15 errores encontrados y como se corrigieron

### Causa raiz
El Knowledge Hub usa campo **"value"** y metodo **GET** para lecturas.
El auditor asumio campo **"data"** y metodo **POST** para todo.

### Errores criticos (KB API)

**Error 1 — kbSave usa "data" (core/loop.js:91)**
- Original: `{ key, data: JSON.stringify(data) }`
- Fix: `{ key, value: JSON.stringify(data) }`
- Impacto: Nada se guardaba en KB. Error 500.

**Error 2 — kbRead usa POST (core/loop.js:96-104)**
- Original: POST /api/read con body `{ key }`
- Fix: GET /api/read?key=X
- Impacto: "Cannot POST /api/read"

**Error 3 — kbRead lee .data (core/loop.js:103)**
- Original: `(await r.json()).data`
- Fix: `(await r.json()).entry?.value`
- Impacto: Siempre null

**Error 4 — kbList usa POST (core/loop.js:98-105)**
- Original: POST /api/list con body `{ prefix }`
- Fix: GET /api/list paginado + filtro client-side por key prefix
- Impacto: Listas siempre vacias. Janitor y autodream no podian limpiar.
- Nota: KB no tiene filtro nativo por key prefix. Hay que paginar y filtrar.

**Error 5 — kbList lee .keys (core/loop.js:104)**
- Original: `(await r.json()).keys`
- Fix: `(await r.json()).entries.map(e => e.key)`
- Impacto: undefined

**Error 6 — kbDelete usa "data" (core/loop.js:108)**
- Original: `{ key, data: 'null' }`
- Fix: `{ key, value: 'null' }`
- Impacto: Deletes no funcionaban

**Error 7 — Proxy health check (core/loop.js:593)**
- Original: `fetch('http://localhost:8317/v1/models')` = 401 (requiere auth)
- Fix: `fetch('http://localhost:8317/')` = 200 (sin auth)
- Impacto: proxy siempre "degraded"

### Errores de configuracion

**Error 8 — clients.json path incorrecto**
- Original: `/home/gestoria/gestoriard` (NO EXISTE)
- Fix: `/home/gestoria/gestion-contadoresrd`
- Impacto: probe gestoriard fallaba (git:?, disk:"")

**Error 9 — clients.json solo 2 clientes**
- Original: gestoriard + iatrader
- Fix: 6 clientes reales (gestoriard, dgii, iatrader-rust, facturaia, seguridad, jobhunter)
- Impacto: 4 agentes invisibles

**Error 10 — IATRADER Python obsoleto**
- Original: id "iatrader", tmux "iatrader-rust", path IATRADER
- Fix: id "iatrader-rust" con path correcto
- Impacto: Confundia proyecto viejo con nuevo

### Errores en MCP server

**Error 11 — Schema usa "data"**
- Original: `{ key: string, data: object }`
- Fix: `{ key: string, value: string }`

**Error 12 — Handler usa args.data**
- Original: `kbSave(args.key, args.data)`
- Fix: `kbSave(args.key, args.value)`

**Error 13 — Response usa { data: }**
- Original: `return { data: kbRead(args.key) }`
- Fix: `return { value: kbRead(args.key) }`

### Errores en script de verificacion

**Error 14 — verify-kb-integrity.sh**
- Mismos bugs que core/loop.js (POST para reads, "data", /v1/models)
- Fix: Reescrito completo con GET + "value" + /

### Errores en documentacion

**Error 15 — DISPATCH.md**
- Decia "13/13 smoke tests" (son 12/12 smoke + 21/21 full)
- Decia "SypnoseProxy" (nombre real: CLIProxy)

---

## SECCION 5: Reglas de oro

Cada regla nace de un error real. NUNCA violar.

| # | Regla | Error que la origino |
|---|---|---|
| 1 | KB usa campo "value", NUNCA "data" | Errors 1, 6 |
| 2 | KB reads son GET con query params, NUNCA POST | Errors 2, 4 |
| 3 | KB read response: entry.value, no .data | Error 3 |
| 4 | KB list devuelve .entries, no .keys | Error 5 |
| 5 | KB list NO filtra por key prefix — paginar y filtrar client-side | Error 4 |
| 6 | CLIProxy health: GET / sin auth, NO /v1/models | Error 7 |
| 7 | Verificar paths con ls -d ANTES de escribir config | Error 8 |
| 8 | Descubrir agentes con tmux list-sessions, no hardcodear | Errors 9, 10 |
| 9 | MCP schema = mismos campos que KB API | Errors 11-13 |
| 10 | Escribir y probar verify script ANTES del coordinator | Error 14 |
| 11 | Boris en cada paso: start_task, verify, save_state | Sin Boris los errores se acumulan |

---

## SECCION 6: Instalacion paso a paso

### Paso 1: Subir paquete al servidor

```bash
scp -P <PUERTO_SSH> sypnose-v52.tar.gz <USUARIO>@<IP_SERVIDOR>:/tmp/
```
Output esperado: (silencio = exito)

### Paso 2: Descomprimir

```bash
ssh -p <PUERTO_SSH> <USUARIO>@<IP_SERVIDOR>
cd /tmp && tar xzf sypnose-v52.tar.gz
ls /tmp/sypnose-v52/
```
Output esperado: bin/ config/ core/ lib/ mcp/ scripts/ server/ systemd/ + archivos

### Paso 3: Copiar a /opt/sypnose/

```bash
sudo mkdir -p /opt/sypnose
sudo cp -r /tmp/sypnose-v52/* /tmp/sypnose-v52/.env.example /tmp/sypnose-v52/.npmignore /opt/sypnose/
sudo chown -R <USUARIO>:<USUARIO> /opt/sypnose
```

### Paso 4: Permisos

```bash
cd /opt/sypnose
chmod +x bin/start.js scripts/*.js scripts/*.sh
chmod 600 .env
```

### Paso 5: Dependencias

```bash
cd /opt/sypnose && npm install
```
Output esperado: "added 4 packages, 0 vulnerabilities"

### Paso 6: Configurar .env

```bash
cp .env.example .env
```

Variables a configurar:

| Variable | Valor | Descripcion |
|---|---|---|
| KB_API | http://localhost:18791/api | URL del Knowledge Hub |
| PROXY_URL | http://localhost:8317/v1/chat/completions | URL de CLIProxy |
| ANTHROPIC_API_KEY | sk-ant-PLACEHOLDER | No se usa si CLIProxy esta activo |
| ANTHROPIC_API_URL | https://api.anthropic.com/v1/messages | Fallback directo |
| WEBHOOK_TOKEN | (generar) | openssl rand -hex 16 |
| TRACE_SALT | (generar) | openssl rand -hex 8 |
| SSE_PORT | 18795 | Puerto del SSE server |
| SSE_CORS | * | CORS para SSE |
| NODE_ENV | production | Modo produccion |
| BRIEF | 0 | 1 = logs minimos |

### Paso 7: Configurar clients.json

Primero descubrir agentes reales:
```bash
tmux list-sessions -F '#{session_name}'
```

Luego editar /opt/sypnose/config/clients.json:
```json
{
  "clients": [
    {
      "id": "mi-proyecto",
      "tmux_session": "nombre-sesion-tmux",
      "project_dir": "/home/<USUARIO>/mi-proyecto",
      "client_name": "Mi Proyecto",
      "industry": "descripcion"
    }
  ]
}
```

IMPORTANTE: Verificar cada path:
```bash
ls -d /home/<USUARIO>/mi-proyecto || echo "PATH NO EXISTE"
tmux has-session -t nombre-sesion-tmux 2>/dev/null && echo OK || echo "SESION NO EXISTE"
```

### Paso 8: Directorios de log

```bash
sudo mkdir -p /var/log/sypnose/audit /var/log/sypnose/events
sudo chown -R <USUARIO>:<USUARIO> /var/log/sypnose
```

### Paso 9: Systemd services

```bash
sudo cp /opt/sypnose/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
```

Contenido sypnose-coordinator.service:
```ini
[Unit]
Description=SYPNOSE Coordinator v5.2
After=network.target

[Service]
Type=simple
User=<USUARIO>
WorkingDirectory=/opt/sypnose
ExecStart=/usr/bin/node /opt/sypnose/bin/start.js
Restart=always
RestartSec=10
EnvironmentFile=/opt/sypnose/.env
Environment=NODE_ENV=production
LimitNOFILE=65536
MemoryMax=2G

[Install]
WantedBy=multi-user.target
```

Contenido sypnose-sse.service:
```ini
[Unit]
Description=SYPNOSE SSE v5.2
After=sypnose-coordinator.service

[Service]
Type=simple
User=<USUARIO>
WorkingDirectory=/opt/sypnose
ExecStart=/usr/bin/node /opt/sypnose/server/sse-server.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/sypnose/.env

[Install]
WantedBy=multi-user.target
```

### Paso 10: Crontab

```bash
(crontab -l 2>/dev/null; echo ""; echo "# === SYPNOSE v5.2 ==="; echo "0 3 * * * /usr/bin/node /opt/sypnose/scripts/kb-janitor.js >> /var/log/sypnose/janitor.log 2>&1"; echo "30 3 * * * /usr/bin/node /opt/sypnose/scripts/autodream-cli.js >> /var/log/sypnose/dream.log 2>&1") | crontab -
```

### Paso 11: Tests (NO arrancar daemons todavia)

```bash
cd /opt/sypnose && npm test
```
Output esperado: "12/12 passed ALL GREEN"

```bash
cd /opt/sypnose && node scripts/test-full.js
```
Output esperado: "21/21 passed ALL GREEN"

```bash
cd /opt/sypnose && bash scripts/verify-kb-integrity.sh
```
Output esperado: "KB health: OK, KB write/read: OK, SypnoseProxy: OK"

Si CUALQUIER test falla: PARAR. No arrancar daemons. Diagnosticar.

### Paso 12: Limpiar /tmp

```bash
rm -rf /tmp/sypnose-v52 /tmp/sypnose-v52.tar.gz
```

---

## SECCION 7: Arranque y verificacion

### 7.1 Desactivar PROACTIVE

```bash
# Editar /opt/sypnose/flags.json
# Cambiar: "PROACTIVE": { "enabled": false, ... }
```

### 7.2 Arrancar daemons

```bash
sudo systemctl enable --now sypnose-coordinator sypnose-sse
```

### 7.3 Esperar 30 segundos y verificar

```bash
# Probes de cada agente:
journalctl -u sypnose-coordinator -n 15 --no-pager
```
Output esperado: probe para cada agente con git, disk, tmux:"alive"

```bash
# Health del coordinator:
# Buscar en los logs: Y2 health {"kb":"ok","proxy":"ok"}
```

```bash
# SSE health:
curl -s http://localhost:18795/health
```
Output esperado: `{"status":"ok","clients":0}`

```bash
# KB integrity despues de arrancar:
bash /opt/sypnose/scripts/verify-kb-integrity.sh
```
Output esperado: todo OK, namespaces con entries

### 7.4 Dashboard

```bash
cd /opt/sypnose && node scripts/kb-dashboard.js
```
Muestra namespaces y conteos. Mailbox, Tasks, Memory, etc.

---

## SECCION 8: Registrar agentes nuevos

### Paso 1: Crear sesion tmux
```bash
tmux new-session -d -s <nombre> -c /home/<USUARIO>/<proyecto>
```

### Paso 2: Registrar en scripts de arranque
Editar ~/scripts/start-tmux-sessions.sh:
```bash
SESSIONS[<nombre>]="/home/<USUARIO>/<proyecto>"
```

### Paso 3: Configurar proyecto Sypnose
```bash
cd /home/<USUARIO>/<proyecto>
mkdir -p .claude .brain
```

Crear .claude/settings.local.json:
```json
{
  "permissions": {
    "allow": [
      "Bash(*)", "Read(*)", "Edit(*)", "Write(*)",
      "Glob(*)", "Grep(*)", "Agent(*)", "TodoWrite(*)", "Skill(*)",
      "mcp__knowledge-hub__kb_read",
      "mcp__knowledge-hub__kb_save",
      "mcp__knowledge-hub__kb_search",
      "mcp__boris__boris_get_state",
      "mcp__boris__boris_start_task",
      "mcp__boris__boris_verify",
      "mcp__boris__boris_register_done",
      "mcp__boris__boris_sync"
    ],
    "deny": ["Bash(rm -rf *)", "Bash(sudo reboot*)"],
    "defaultMode": "bypassPermissions"
  }
}
```

Crear CLAUDE.md con identidad + Boris + comunicacion KB.

Crear .brain/task.md, session-state.md, history.md, done-registry.md.

### Paso 4: Registrar en Sypnose v5.2
Editar /opt/sypnose/config/clients.json (anadir entrada).

```bash
sudo systemctl restart sypnose-coordinator
journalctl -u sypnose-coordinator -n 10 --no-pager | grep <nombre>
```
Output esperado: probe con tmux:"alive"

### Paso 5: Instalar Boris hooks
```bash
cp -r /home/<USUARIO>/<proyecto-existente>/.claude/hooks /home/<USUARIO>/<proyecto>/.claude/
cp -r /home/<USUARIO>/<proyecto-existente>/.claude/rules /home/<USUARIO>/<proyecto>/.claude/
```

### Paso 6: Arrancar Claude
```bash
tmux send-keys -t <nombre> "claude --dangerously-skip-permissions" Enter
```

---

## SECCION 9: Produccion (cuando todo este estable)

1. flags.json: PROACTIVE = true (auto-restart agentes stale >24h)
2. Webhooks: POST /webhook/<source> con X-Webhook-Token
3. autoDream: se ejecuta a las 3:30AM, consolida memoria de cada agente
4. Monitoreo: curl localhost:18795/sse para stream SSE en tiempo real
5. Flag toggle remoto: POST /flags/<client_id>/<flag>?token=X&value=true

---

## SECCION 10: Troubleshooting

| Problema | Diagnostico | Solucion |
|---|---|---|
| KB no responde | curl localhost:18791/health | Verificar que knowledge-hub service esta activo |
| CLIProxy 401 | curl localhost:8317/ (debe dar 200) | Si / falla, CLIProxy esta caido. Verificar service |
| Agente no aparece en probes | journalctl + grep nombre | Verificar path en clients.json + tmux session existe |
| Tests fallan | npm test 2>&1 | Leer el error exacto. Generalmente es KB no accesible |
| SSE sin clientes | curl localhost:18795/health | Normal si nadie esta suscrito a /sse |
| Coordinator crashea | journalctl -u sypnose-coordinator | MemoryMax=2G puede matar si RAM llena. Verificar free -h |
| proxy: degraded | Verificar que / responde 200 | Si /v1/models da 401, el health check apunta al endpoint incorrecto |
| kbList devuelve vacio | El KB no filtra por key prefix | kbList pagina y filtra client-side. Si hay >2000 entries, puede no encontrar |
| Restart no cambia PID | systemctl restart cacheado | sudo systemctl stop + sleep 3 + sudo systemctl start |
| verify-kb-integrity falla | w=500 o r=empty | Verificar que kbSave usa "value" y kbRead usa GET |

---

## FASE 1 COMPLETADA: 2026-04-03

- Sypnose v5.2 instalada en /opt/sypnose/
- 15 errores del auditor corregidos
- 6 agentes detectados (gestoriard, dgii, iatrader-rust, facturaia, seguridad, jobhunter)
- 21/21 tests ALL GREEN
- KB write/read OK
- Coordinator + SSE activos
- Documentacion completa

---

# FASE 2: Componentes dependientes (servidor limpio)

Estos componentes deben estar instalados ANTES de Sypnose v5.2.
Orden de instalacion: KB Hub -> CLIProxy -> Boris -> SSE Hub -> Channel MCP -> sm-tmux.

---

## SECCION 11: Knowledge Hub (:18791)

### Que es
Servidor de base de conocimiento con FTS5 (Full-Text Search). API HTTP REST + MCP stdio.
Bus de comunicacion entre todos los agentes. SQLite + Express + better-sqlite3.

### Donde vive
- Path: /opt/knowledge-hub/ (1097 lineas src, 7 archivos JS)
- Puerto: 18791 (solo 127.0.0.1)
- BD: /opt/knowledge-hub/data/knowledge.db (SQLite WAL mode)
- Systemd: knowledge-hub.service

### Dependencias
```json
"@modelcontextprotocol/sdk": "^1.27.1",
"better-sqlite3": "^12.8.0",
"express": "^5.2.1",
"zod": "^4.3.6"
```

### Instalacion
```bash
mkdir -p /opt/knowledge-hub/data
cd /opt/knowledge-hub
npm install
# better-sqlite3 necesita: apt install build-essential python3
chown -R <USUARIO>:<USUARIO> /opt/knowledge-hub
```

### Systemd service
```ini
[Unit]
Description=KnowledgeHub MCP Server - Knowledge Base with FTS5
After=network.target

[Service]
Type=simple
User=<USUARIO>
Group=<USUARIO>
WorkingDirectory=/opt/knowledge-hub
ExecStart=/usr/bin/node /opt/knowledge-hub/src/server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal
SyslogIdentifier=knowledge-hub

[Install]
WantedBy=multi-user.target
```

### API endpoints

| Metodo | Path | Parametros | Descripcion |
|---|---|---|---|
| GET | /health | - | Estado, conteos por tier, inbox, a2a, canales |
| POST | /api/save | {key, value, category?, project?} | Guardar/actualizar entrada |
| GET | /api/read | ?key=X&project=Y | Leer por clave exacta |
| GET | /api/list | ?category=X&limit=N&offset=N | Listar con filtros |
| GET | /api/search | ?q=QUERY&limit=N | Busqueda FTS5 |
| GET | /api/context | ?project=X&limit=N | Entries HOT como markdown |
| GET | /api/stats | - | Estadisticas por tier/categoria/proyecto |
| POST | /api/prune | {dryRun?} | Degradar entries antiguas |
| POST | /api/inbox/send | {to, from?, message, priority?} | Enviar a inbox agente |
| GET | /api/inbox/check | ?for=AGENTE&limit=N | Leer no leidos |
| POST | /api/inbox/ack | {id} | Marcar como leido |
| POST | /a2a/send | {from, to, payload, type?} | Mensaje directo entre agentes |
| GET | /a2a/messages | ?agent=X&unread=true | Mensajes recibidos |
| POST | /channels/publish | {channel, from, message} | Publicar en canal broadcast |
| GET | /channels/list | ?project=X | Listar canales |

### Verificacion
```bash
curl -s http://localhost:18791/health
# Esperado: {"status":"ok","service":"knowledge-hub","version":"1.1.0",...}

curl -s -X POST http://localhost:18791/api/save -H "Content-Type: application/json" \
  -d '{"key":"test","value":"ok"}'
# Esperado: {"success":true,...}

curl -s 'http://localhost:18791/api/read?key=test'
# Esperado: {"entry":{"value":"ok",...}}
```

### Troubleshooting
- "Cannot find module" -> npm install falta
- better-sqlite3 no compila -> apt install build-essential python3
- Puerto en uso -> lsof -i :18791
- SQLITE_BUSY -> verificar que no hay dos instancias corriendo

---

## SECCION 12: CLIProxy / SypnoseProxy (:8317)

### Que es
Router de modelos IA escrito en Go. Un endpoint OpenAI-compatible, multiples providers.
47 modelos: Gemini (gratis via OAuth), Claude, Perplexity, Groq, Cerebras, OpenRouter.

### Donde vive
- Path: /home/<USUARIO>/cliproxyapi/
- Binario: cli-proxy-api (Go ELF 64-bit, estatico, sin deps)
- Puerto: 8317 (127.0.0.1 + 172.17.0.1 via socat para Docker)
- Systemd: cliproxyapi.service

### Modelos principales (gratis)
- gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite (OAuth)
- qwen3-coder-plus, qwen3-coder-flash (via Gemini)
- llama-3.3-70b, llama-4-scout, kimi-k2 (Groq)
- cerebras-qwen3-235b (Cerebras)
- deepseek-v3.2, deepseek-r1 (OpenRouter)
- sonar-pro, sonar-reasoning (Perplexity)

### Instalacion
```bash
mkdir -p /home/<USUARIO>/cliproxyapi/logs
# Copiar binario cli-proxy-api + config.yaml
chmod +x cli-proxy-api
```

### config.yaml (estructura minima)
```yaml
host: "127.0.0.1"
port: 8317
api-keys:
  - "sk-TU-API-KEY-LOCAL"
auth-dir: "~/.cli-proxy-api"
request-retry: 4
routing:
  strategy: "round-robin"
# Providers: ver config.yaml completo para Groq, Cerebras, OpenRouter, Perplexity
```

### Systemd service
```ini
[Unit]
Description=CLIProxyAPI Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/<USUARIO>/cliproxyapi
ExecStart=/home/<USUARIO>/cliproxyapi/cli-proxy-api
Restart=always
RestartSec=10
Environment=HOME=/home/<USUARIO>

[Install]
WantedBy=default.target
```

### Verificacion
```bash
curl -s http://localhost:8317/
# Esperado: {"endpoints":[...],"message":"CLI Proxy API Server"}

curl -s http://localhost:8317/v1/models -H "Authorization: Bearer TU-KEY" | head -20
# Esperado: lista de modelos
```

### Acceso desde Windows (tunel SSH)
```bash
ssh -L 8317:localhost:8317 -p <PUERTO_SSH> <USUARIO>@<IP> -N &
```

---

## SECCION 13: Boris v6.2 (verificacion por proyecto)

### Que es
Sistema de quality gate. Principio: sin evidencia verificada no hay commit.
Bloquea git commit via hook bash. Fuerza al agente a llamar boris_verify del MCP.
Persiste estado en .brain/ entre sesiones.

### 6 hooks

**boris-session-start.sh** (SessionStart)
- git pull --rebase
- Crea .brain/ si no existe
- Muestra task.md, session-state.md, done-registry.md
- Cuenta archivos sin commit

**boris-pre-compact.sh** (PreCompact)
- Guarda session-state.md con timestamp, branch, ultimo commit
- git commit --no-verify .brain/ (auto-save antes de perder contexto)

**boris-verification-gate.sh** (PreToolUse Bash) — EL MAS IMPORTANTE
- Solo intercepta comandos con "git commit"
- Verifica que existe .brain/last-verification.md
- Bloquea si tiene frases vagas ("deberia funcionar", "creo que", "parece que")
- Longitud minima 30 chars
- Anti-trampa: bloquea echo/cat al archivo + commit en mismo comando
- Si pasa: consume evidencia (mv a .used) — cada commit necesita evidencia nueva

**boris-protect-files.sh** (PreToolUse Write/Edit/Read/Bash)
- Bloquea acceso a: .env, credentials, secret, private.key, .pem, password

**boris-stop.sh** (Stop)
- git add .brain/ + commit --no-verify + push

**kb-inbox-check.sh** (UserPromptSubmit)
- Polling KB inbox, muestra notificaciones, auto-ack

### Estructura .brain/
```
.brain/
  task.md              <- tarea activa, pasos, proximo paso
  session-state.md     <- timestamp, fase, branch, ultimo commit
  done-registry.md     <- tabla completados + fallidos
  history.md           <- log permanente
  last-verification.md <- escrito por boris_verify, consumido por hook
```

### Instalacion por proyecto
```bash
mkdir -p .claude/hooks .claude/rules .brain

# Copiar hooks de proyecto existente:
cp /home/<USUARIO>/<proyecto-ref>/.claude/hooks/*.sh .claude/hooks/
chmod +x .claude/hooks/*.sh

# Copiar rules:
cp /home/<USUARIO>/<proyecto-ref>/.claude/rules/*.md .claude/rules/

# Inicializar .brain/:
echo "# Task\nNo hay tarea activa." > .brain/task.md
echo "# Session State\nNueva sesion." > .brain/session-state.md
touch .brain/history.md .brain/done-registry.md
```

### Configurar hooks en settings.local.json
```json
{
  "hooks": {
    "SessionStart": [{"type":"command","command":"bash .claude/hooks/boris-session-start.sh"}],
    "PreCompact": [{"type":"command","command":"bash .claude/hooks/boris-pre-compact.sh"}],
    "Stop": [{"type":"command","command":"bash .claude/hooks/boris-stop.sh"}],
    "UserPromptSubmit": [{"type":"command","command":"bash .claude/hooks/kb-inbox-check.sh"}],
    "PreToolUse": [
      {"type":"command","command":"bash .claude/hooks/boris-verification-gate.sh","matcher":"Bash"},
      {"type":"command","command":"bash .claude/hooks/boris-protect-files.sh","matcher":"Write|Edit|Read|Bash"}
    ]
  }
}
```

### Flujo
```
Agente trabaja -> llama boris_verify MCP -> escribe last-verification.md
-> git commit -> hook verifica evidencia -> consume (mv .used) -> commit pasa
Sin evidencia = BLOQUEADO (exit 2)
```

### Verificacion
```bash
# Test: commit sin evidencia (debe fallar)
git add README.md && git commit -m "test sin evidencia"
# Esperado: BLOQUEADO: Falta .brain/last-verification.md
```

---

## SECCION 14: SSE Hub (:8095)

### Que es
Microservicio Node.js puro (zero deps npm) que hace polling al KB cada 5s
y emite Server-Sent Events a clientes suscritos. Bridge en tiempo real.

### Donde vive
- Path: /home/shared/sypnose-hub/
- Puerto: 8095
- Systemd: sypnose-hub.service
- Env: /home/<USUARIO>/.config/sypnose-hub.env

### Instalacion
```bash
mkdir -p /home/shared/sypnose-hub
# Copiar index.js + package.json
# Crear .env:
cat > /home/<USUARIO>/.config/sypnose-hub.env << 'EOF'
SYPNOSE_HUB_TOKEN=<GENERAR: openssl rand -hex 32>
PORT=8095
EOF
```

### Endpoints
| Metodo | Path | Auth | Descripcion |
|---|---|---|---|
| GET | /health | No | Status: clientes, uptime, buffer, lastSeenId |
| GET | /stream | Bearer | SSE stream de notificaciones |
| GET | /stream?project=X | Bearer | SSE filtrado por proyecto |
| GET | /stream?last_id=N | Bearer | Reconexion con replay |
| POST | /publish | Bearer | Publicar evento directo |

### Systemd service
```ini
[Unit]
Description=Sypnose Hub — SSE Bridge sobre Knowledge Hub
After=network.target

[Service]
Type=simple
User=<USUARIO>
WorkingDirectory=/home/shared/sypnose-hub
ExecStart=/usr/bin/node /home/shared/sypnose-hub/index.js
ExecStartPost=/bin/bash -c 'sleep 2 && curl -sf http://localhost:8095/health > /dev/null || exit 1'
EnvironmentFile=/home/<USUARIO>/.config/sypnose-hub.env
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Verificacion
```bash
curl http://localhost:8095/health
# Esperado: {"status":"ok","clients":N,...}

TOKEN="<tu-token>"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8095/stream
# Esperado: mantiene conexion abierta, headers SSE
```

---

## SECCION 15: Channel MCP (cliente SSE)

### Que es
MCP Server en TypeScript/Bun que se suscribe al SSE Hub y expone tools
a Claude Code: reply_to_agent y agent_status. Reconexion automatica cada 5s.

### Donde vive
- Path: /home/shared/sypnose-hub/channel/
- Runtime: Bun
- Systemd: sypnose-channel.service

### Dependencias
```json
"@modelcontextprotocol/sdk": "^1.28.0"
```

### Instalacion
```bash
# Instalar Bun:
curl -fsSL https://bun.sh/install | bash

cd /home/shared/sypnose-hub/channel
bun install
```

### Systemd service
```ini
[Unit]
Description=Sypnose Channel — MCP SSE Bridge
After=sypnose-hub.service
Wants=sypnose-hub.service

[Service]
Type=simple
User=<USUARIO>
WorkingDirectory=/home/shared/sypnose-hub/channel
ExecStart=/home/<USUARIO>/.bun/bin/bun run sypnose-channel.ts
Restart=always
RestartSec=5
Environment=SYPNOSE_HUB_URL=http://localhost:8095
Environment=SYPNOSE_HUB_TOKEN=<MISMO-TOKEN-QUE-HUB>

[Install]
WantedBy=multi-user.target
```

### Config Claude Desktop (Windows, con tunel SSH)
```json
"sypnose-channel": {
  "command": "bun",
  "args": ["run", "sypnose-channel.ts"],
  "env": {
    "SYPNOSE_HUB_URL": "http://localhost:8095",
    "SYPNOSE_HUB_TOKEN": "<TOKEN>"
  }
}
```
Requiere tunel: ssh -L 8095:localhost:8095 -p <PUERTO_SSH> <USUARIO>@<IP> -N

### Tools MCP expuestos
- reply_to_agent(agent, message, priority?, project?)
- agent_status()

### Verificacion
```bash
systemctl status sypnose-channel
journalctl -u sypnose-channel -f
# Esperado: [sypnose-channel] Connected to hub
```

---

## SECCION 16: sm-tmux (CLI envio de planes)

### Que es
Wrapper bash (1499 lineas) que el SM usa para enviar planes a arquitectos
via KB + tmux. Incluye Gemini Gate que valida automaticamente cada plan.

### Donde vive
- Path: /usr/local/bin/sm-tmux
- Config: ~/.config/sm-tmux.env (CLIPROXY_API_KEY)
- Log: ~/.openclaw/sm-tmux.log
- Cache: ~/.openclaw/plan-cache/ (TTL 5 min)

### Comandos principales

| Comando | Descripcion |
|---|---|
| send <sesion> <plan> | Validar con Gemini y enviar a tmux |
| send --dry-run <sesion> <plan> | Solo validar, no enviar |
| send --force <sesion> <plan> | Saltar Gemini (emergencia) |
| template <code/docker/infra/report> | Generar skeleton Boris |
| inbox [--all] | Ver notificaciones de arquitectos |
| ack <key/--all> | Marcar como leida |
| reply <key> <msg> | Responder a notificacion |
| watch | Live feed de notificaciones |
| dashboard | Panel completo: sesiones, inbox, tasks, stats |
| followup <sesion> | Resumen IA del progreso del arquitecto |
| queue | Tasks pending en KB |
| list | Sesiones tmux activas |
| capture <sesion> [N] | Ver ultimas N lineas del terminal |
| stats | Metricas 24h |
| resend <sesion> | Reenviar ultimo plan |
| a2a <sesion> <msg> | Mensaje directo a agente |

### Gemini Gate — 7 etiquetas obligatorias
PLAN, TAREA, MODELO, BORIS, VERIFICACION, EVIDENCIA, KB

Modelos con fallback: gemini-2.5-flash -> gemini-2.5-flash-lite -> qwen3-coder-plus

Rechaza si: falta etiqueta, contenido vago, BORIS no corresponde al tipo de trabajo,
frontend verificado solo con grep, multi-wave sin checkpoints por wave.

### Instalacion
```bash
cp sm-tmux /usr/local/bin/sm-tmux
chmod +x /usr/local/bin/sm-tmux
mkdir -p ~/.config ~/.openclaw/pending-plans ~/.openclaw/plan-cache
echo 'CLIPROXY_API_KEY="<TU-KEY>"' > ~/.config/sm-tmux.env
```

Requiere: tmux, curl, jq, python3, sha256sum, CLIProxy en :8317, KB en :18791

### Verificacion
```bash
sm-tmux list
# Esperado: sesiones tmux activas

sm-tmux send --dry-run <sesion> "PLAN: Test
TAREA: Verificar Gemini Gate
MODELO: claude-sonnet-4-6
BORIS: solo lectura — no modifica
VERIFICACION: echo test ok
EVIDENCIA: output test ok
KB: kb_save key=test category=response project=test"
# Esperado: APROBADO (Gemini valida, no envia)
```

---

## SECCION 17: Templates para proyectos nuevos

### Donde viven
```
prerequisites/templates/
├── settings.local.json.example   <- Permisos y hooks para agente Sypnose
├── hooks-config.json.example     <- Config de hooks para settings.local.json
└── CLAUDE.md.template            <- Identidad + Boris + KB para nuevo agente
```

### Como usarlos al crear un agente nuevo

```bash
cd /home/<USUARIO>/<nuevo-proyecto>
mkdir -p .claude/hooks .claude/rules .brain

# 1. Copiar y adaptar settings
cp /home/<USUARIO>/sypnose/prerequisites/templates/settings.local.json.example \
   .claude/settings.local.json

# 2. Copiar template CLAUDE.md y editar identidad del agente
cp /home/<USUARIO>/sypnose/prerequisites/templates/CLAUDE.md.template CLAUDE.md
# Editar: nombre del agente, proyecto, stack, comandos de verificacion

# 3. Copiar hooks Boris de un proyecto existente
cp /home/<USUARIO>/gestion-contadoresrd/.claude/hooks/*.sh .claude/hooks/
chmod +x .claude/hooks/*.sh

# 4. Inicializar .brain/
echo "# Task\nNo hay tarea activa." > .brain/task.md
echo "# Session State\nNueva sesion." > .brain/session-state.md
touch .brain/history.md .brain/done-registry.md
```

### settings.local.json minimo para agente Sypnose

```json
{
  "permissions": {
    "allow": [
      "Bash(*)", "Read(*)", "Edit(*)", "Write(*)",
      "Glob(*)", "Grep(*)", "MultiEdit(*)",
      "mcp__*", "Agent(*)", "TodoWrite(*)", "Skill(*)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo reboot*)"
    ],
    "defaultMode": "bypassPermissions"
  }
}
```

**CRITICO**: `"defaultMode": "bypassPermissions"` — sin esto el agente pregunta permisos
y se detiene. Los agentes Sypnose son autonomos.

### Verificacion
```bash
# El agente debe arrancar sin preguntar permisos:
tmux send-keys -t <nombre> "claude --dangerously-skip-permissions" Enter
# Si pide confirmacion -> revisar settings.local.json
```

---

## SECCION 18: Boris MCP Server

### Que es
Servidor MCP Python (644 lineas) que proporciona herramientas de quality gate
y persistencia de estado a cada arquitecto Claude Code.

### Archivo
```
prerequisites/boris/boris_mcp.py
```

### Las 7 tools

| Tool | Funcion |
|---|---|
| `boris_start_task(name, desc)` | Inicia tarea: git pull, git tag, crea estado inicial en .brain/ |
| `boris_get_state()` | Lee .brain/ completo: task, session-state, history, done-registry |
| `boris_save_state(progress, next_step)` | Guarda progreso periodico (llamar cada 15 min) |
| `boris_verify(what_changed, how_verified, result)` | Registra evidencia OBLIGATORIA antes de commit |
| `boris_register_done(task_name, summary)` | Marca tarea completada, envia notificacion KB |
| `boris_sync()` | git add .brain/ + commit --no-verify + push |
| `boris_end_session(summary)` | Cierre limpio: guarda, sincroniza, kb_save category=report |

### Flujo obligatorio por tarea

```
1. boris_start_task("nombre", "descripcion")
2. ... trabajar ...
3. boris_save_state(progress="lo completado", next_step="lo siguiente")  <- cada 15 min
4. boris_verify(what_changed="...", how_verified="...", result="output real")
5. git commit (el hook valida la evidencia de boris_verify)
6. boris_register_done("nombre", "resumen + verificacion")
7. boris_end_session("resumen final")
```

### Instalacion en servidor

```bash
pip install mcp pydantic --break-system-packages
mkdir -p ~/.boris
cp prerequisites/boris/boris_mcp.py ~/.boris/
claude mcp add boris --scope user -- python3 ~/.boris/boris_mcp.py
```

### Instalacion en Windows/Mac

```bash
pip install mcp pydantic
mkdir -p ~/.boris
cp prerequisites/boris/boris_mcp.py ~/.boris/
claude mcp add boris --scope user -- python3 ~/.boris/boris_mcp.py
```

### Verificacion

```bash
claude mcp list | grep boris
# Debe mostrar: boris (python3 ~/.boris/boris_mcp.py)

# Probar que funciona:
claude mcp call boris boris_get_state
# Debe devolver: { state: "..." }
```

---

## SECCION 19: Slash commands y skills

### Commands (.claude/commands/)

El repo contiene 19 archivos en `.claude/commands/`:

| Archivo | Comando | Funcion |
|---|---|---|
| `bios.md` | /bios | Protocolo arranque: load KB, estado, inbox, reportar |
| `sypnose-create-plan.md` | /sypnose-create-plan | 6 pasos para crear y enviar plan a arquitecto |
| `workflow-obligatorio.md` | /workflow-obligatorio | Checklist pre/post tarea (git pull, tag, commit) |
| `boris-start.md` | /boris-start | Arranque Boris con los 9 pasos |
| `01-verificacion.md` | Regla | Sin evidencia no hay commit |
| `02-memory-protocol.md` | Regla | Persistencia entre sesiones con .brain/ |
| `05-modelos-ia.md` | Regla | Matriz de modelos: gratis vs pago |
| `06-boris-flujo.md` | Regla | Flujo Boris completo 9 pasos |
| `delegate.md` | /delegate | Como delegar con Agent tool correctamente |
| `ralph.md` | /ralph | Loop autonomo en servidor |
| `dgii-fiscal.md` | /dgii-fiscal | Conocimiento fiscal DGII dominicano |
| `design-*.md` | /design-* | Suite de diseno: accessibility, critique, system, etc. |

### Los 3 commands mas importantes

**`/bios`** — Primer comando de cada sesion:
```
1. Carga MEMORY.md del proyecto
2. Lee .brain/task.md y session-state.md
3. kb_inbox_check para notificaciones pendientes
4. Verifica sesiones tmux activas
5. Reporta: donde estamos, que falta, que recomiendas
```

**`/sypnose-create-plan`** — Para enviar trabajo a arquitectos:
```
1. INVESTIGAR: kb_search del tema
2. CREAR PLAN con 6 etiquetas obligatorias
3. MOSTRAR a Carlos — NO enviar sin aprobacion
4. GUARDAR en KB: kb_save key=task-[nombre] category=task
5. ENVIAR via sm-tmux con Gemini Gate
6. MONITOREAR resultado
```

**`/workflow-obligatorio`** — Antes de tocar cualquier codigo:
```
1. git pull
2. git tag pre-[tarea]
3. Planificar en waves
4. Ejecutar con Agent tool (model: sonnet)
5. Verificar con evidencia real
6. git commit + git push
7. Documentar en .brain/history.md
```

### Skills (skills/)

| Skill | Directorio | Funcion |
|---|---|---|
| arranque | `skills/arranque/` | Boot completo de sesion SM |
| boris-workflow | `skills/boris-workflow/` | Flujo de desarrollo Boris v6.2 |
| sypnose-create-plan | `skills/sypnose-create-plan/` | Protocolo SM para crear y enviar planes |
| capcut-video | `skills/capcut-video/` | Crear videos en CapCut Desktop programaticamente |
| claw-setup-configuration | `skills/claw-setup-configuration/` | Setup y configuracion OpenClaw |

### Como activar commands y skills en un proyecto

```bash
cd /home/<USUARIO>/<proyecto>
mkdir -p .claude/commands .claude/skills

# Copiar todos los commands:
cp /home/<USUARIO>/sypnose/.claude/commands/*.md .claude/commands/

# O copiar solo los esenciales:
cp /home/<USUARIO>/sypnose/.claude/commands/bios.md .claude/commands/
cp /home/<USUARIO>/sypnose/.claude/commands/sypnose-create-plan.md .claude/commands/
cp /home/<USUARIO>/sypnose/.claude/commands/workflow-obligatorio.md .claude/commands/

# Copiar skills:
cp -r /home/<USUARIO>/sypnose/skills/arranque .claude/skills/
cp -r /home/<USUARIO>/sypnose/skills/boris-workflow .claude/skills/
```

### Verificacion
```bash
# Arrancar Claude y verificar que /bios existe:
claude
/bios
# Debe ejecutar el protocolo de arranque completo
```

---

## SECCION 20: Sincronizacion (sync-sypnose.sh)

### Que es
Script bash (124 lineas) que sincroniza commands, hooks y skills desde el repo
GitHub a todos los proyectos activos en el servidor. Evita sobrescribir archivos
personalizados usando hash SHA-256.

### Archivo
```
sync-sypnose.sh        <- Raiz del repo (version local/Windows)
prerequisites/sync-sypnose.sh  <- Version para servidor
```

### Que hace exactamente

1. Obtiene el SHA del ultimo commit del repo GitHub
2. Si no hay cambios desde la ultima sync -> sale sin hacer nada
3. Si hay cambios: clona repo en /tmp/, copia files cambiados
4. Detecta proyectos en el servidor via tmux list-sessions
5. Para cada proyecto: copia commands/ y hooks/ (solo si SHA cambio)
6. Envia notificacion por Telegram si algo falla
7. Rota el log automaticamente (> 500 lineas -> .bak)

### Instalacion

```bash
# Copiar al servidor:
cp prerequisites/sync-sypnose.sh ~/scripts/sync-sypnose.sh
chmod +x ~/scripts/sync-sypnose.sh

# Crear directorio de logs:
mkdir -p ~/logs

# Configurar cron (cada 6 horas):
(crontab -l 2>/dev/null; echo "0 */6 * * * bash ~/scripts/sync-sypnose.sh >> ~/logs/sypnose-sync.log 2>&1") | crontab -
```

### Verificar cron instalado

```bash
crontab -l | grep sync-sypnose
# Debe mostrar: 0 */6 * * * bash ~/scripts/sync-sypnose.sh ...
```

### Ejecucion manual

```bash
bash ~/scripts/sync-sypnose.sh
# Output esperado:
# [FECHA] sync-sypnose START
# [FECHA] sync-sypnose Cambios detectados: SHA_VIEJO -> SHA_NUEVO
# [FECHA] sync-sypnose Sincronizados: proyecto1, proyecto2
# [FECHA] sync-sypnose END
```

### Variables configurables (editar el script)

| Variable | Valor por defecto | Descripcion |
|---|---|---|
| `REPO_URL` | github.com/radelqui/sypnose.git | Repo fuente |
| `TELEGRAM_BOT_TOKEN` | (configurado) | Token del bot para alertas |
| `TELEGRAM_CHAT_ID` | (configurado) | Chat ID para notificaciones |
| `LOG_FILE` | ~/logs/sypnose-sync.log | Archivo de log |

---

## SECCION 21: Desktop App (Windows/Mac)

### Diferencia servidor vs desktop

| Aspecto | Servidor | Desktop (Windows/Mac) |
|---|---|---|
| Claude | Claude Code CLI en tmux | Claude Code CLI o Claude Desktop |
| KB | Acceso directo localhost:18791 | Via tunel SSH + supergateway |
| SSE | Acceso directo localhost:8095 | Via tunel SSH |
| Rol | Arquitecto (ejecuta) | Service Manager (planifica, aprueba) |
| /bios | Skill en Claude Code | Protocolo manual en CLAUDE.md |
| sm-tmux | Instalado en servidor | Llamado via ssh-mcp |

### CLAUDE-SM.md (desktop/CLAUDE-SM.md)

Protocolo SM adaptado para Claude Desktop. Reemplaza los slash commands que
no existen en Desktop.

**Protocolo BIOS (equivalente a /bios):**
```
1. Leer MEMORY.md del proyecto
2. Leer .brain/task.md y .brain/session-state.md
3. kb_inbox_check para notificaciones
4. Verificar arquitectos: tmux list-sessions (via ssh-mcp)
5. Reportar en 3 lineas: donde estamos, que falta, que recomiendas
```

**Protocolo Crear Plan (equivalente a /sypnose-create-plan):**
```
1. INVESTIGAR: kb_search del tema, leer .brain/history.md
2. CREAR PLAN con 6 etiquetas obligatorias
3. MOSTRAR a Carlos — NO enviar sin aprobacion
4. GUARDAR: kb_save key=task-[nombre] category=task
5. ENVIAR: sm-tmux send <sesion> via ssh-mcp
6. MONITOREAR: kb_search resultado
```

### MCP tunnels (desktop/sypnose-tunnels/)

MCP que abre automaticamente los tuneles SSH al arrancar Claude Desktop.

```bash
# Instalar dependencias:
cd desktop/sypnose-tunnels
npm install

# Configurar en claude_desktop_config.json (Windows: %APPDATA%\Claude\):
{
  "mcpServers": {
    "sypnose-tunnels": {
      "command": "node",
      "args": ["C:/ruta/sypnose/desktop/sypnose-tunnels/index.js"],
      "env": {
        "SSH_HOST": "IP_SERVIDOR",
        "SSH_PORT": "2024",
        "SSH_USER": "gestoria",
        "SSH_KEY_PATH": "C:/Users/USUARIO/.ssh/id_rsa"
      }
    }
  }
}
```

Tuneles que abre automaticamente: 18791 (KB HTTP), 18793 (KB SSE), 8317 (CLIProxy),
8095 (SSE Hub), 3002 (Dashboard), 7681 (ttyd terminal web).

### Config MCP completa para desktop

Ver `prerequisites/MCP-CONFIGS.md` para la configuracion completa con:
- sypnose-tunnels (tuneles automaticos)
- knowledge-hub via supergateway (kb_save, kb_read, kb_search)
- sypnose-channel (notificaciones SSE live)
- ssh-mcp (ejecutar comandos en servidor)

### Prerequisitos Windows/Mac

```bash
# Node.js >= 18
node --version

# supergateway (para knowledge-hub MCP)
npm install -g supergateway

# Clave SSH configurada:
ssh -p <PUERTO> <USUARIO>@<IP>    # debe conectar sin password
```

---

## SECCION 22: Flujo completo de instalacion desde cero

Esta seccion muestra el orden exacto para instalar Sypnose completo en un servidor
limpio Ubuntu 22/24. Sigue las secciones del manual en el orden correcto.

### Prerequisitos del sistema

```bash
# Sistema base:
sudo apt update && sudo apt install -y \
    nodejs npm tmux git build-essential python3 python3-pip \
    curl jq sqlite3

# Verificar versiones:
node --version   # >= 18
tmux -V
git --version
```

### Paso 1: Clonar el repo

```bash
cd /home/<USUARIO>
git clone https://github.com/radelqui/sypnose.git
cd sypnose
```

### Paso 2: Ejecutar instalador automatico

```bash
sudo bash install-sypnose-full.sh <USUARIO>
```

El instalador hace:
- Instalar Knowledge Hub en /opt/knowledge-hub/
- Instalar CLIProxy en /home/<USUARIO>/cliproxyapi/
- Instalar Sypnose v5.2 en /opt/sypnose/
- Instalar SSE Hub en /home/shared/sypnose-hub/
- Configurar todos los servicios systemd
- Arrancar todos los daemons

### Paso 3: Editar clients.json con tus agentes

```bash
# Descubrir sesiones tmux existentes:
tmux list-sessions -F '#{session_name}'

# Editar config:
nano /opt/sypnose/config/clients.json
```

Estructura de cada agente:
```json
{
  "id": "mi-proyecto",
  "tmux_session": "nombre-sesion-tmux",
  "project_dir": "/home/<USUARIO>/mi-proyecto",
  "client_name": "Mi Proyecto",
  "industry": "descripcion"
}
```

```bash
# Verificar paths ANTES de guardar:
ls -d /home/<USUARIO>/mi-proyecto
tmux has-session -t nombre-sesion-tmux 2>/dev/null && echo OK || echo "NO EXISTE"

# Reiniciar coordinator para que lea los cambios:
sudo systemctl restart sypnose-coordinator
journalctl -u sypnose-coordinator -n 15 --no-pager | grep -E "(probe|client)"
```

### Paso 4: Crear primer agente

```bash
# Crear sesion tmux:
tmux new-session -d -s mi-proyecto -c /home/<USUARIO>/mi-proyecto

# Preparar directorio del proyecto:
cd /home/<USUARIO>/mi-proyecto
mkdir -p .claude/hooks .claude/commands .brain

# Copiar templates:
cp /home/<USUARIO>/sypnose/prerequisites/templates/settings.local.json.example \
   .claude/settings.local.json

# Copiar hooks Boris de un proyecto existente (o del repo):
cp /home/<USUARIO>/sypnose/prerequisites/boris/*.sh .claude/hooks/
chmod +x .claude/hooks/*.sh

# Copiar commands esenciales:
cp /home/<USUARIO>/sypnose/.claude/commands/bios.md .claude/commands/
cp /home/<USUARIO>/sypnose/.claude/commands/sypnose-create-plan.md .claude/commands/
cp /home/<USUARIO>/sypnose/.claude/commands/workflow-obligatorio.md .claude/commands/

# Inicializar .brain/:
echo "# Task\nNo hay tarea activa." > .brain/task.md
echo "# Session State\nNueva sesion." > .brain/session-state.md
touch .brain/history.md .brain/done-registry.md

# Crear CLAUDE.md del agente (usar template y adaptar):
cp /home/<USUARIO>/sypnose/prerequisites/templates/CLAUDE.md.template CLAUDE.md
nano CLAUDE.md  # Editar identidad, proyecto, stack, comandos verificacion
```

### Paso 5: Instalar Boris MCP

```bash
pip install mcp pydantic --break-system-packages
mkdir -p ~/.boris
cp /home/<USUARIO>/sypnose/prerequisites/boris/boris_mcp.py ~/.boris/
claude mcp add boris --scope user -- python3 ~/.boris/boris_mcp.py
```

Verificar:
```bash
claude mcp list | grep boris
# Debe mostrar: boris (python3 ~/.boris/boris_mcp.py)
```

### Paso 6: Arrancar daemons y verificar

```bash
# Estado de todos los servicios:
systemctl status knowledge-hub cliproxyapi sypnose-coordinator sypnose-sse sypnose-hub

# Health checks:
curl -s http://localhost:18791/health | python3 -m json.tool
curl -s http://localhost:8317/
curl -s http://localhost:8095/health
curl -s http://localhost:18795/health

# Tests del coordinator:
cd /opt/sypnose && npm test
# Esperado: 12/12 passed ALL GREEN
```

### Paso 7: Probar /bios en el agente

```bash
# Arrancar Claude en la sesion del agente:
tmux send-keys -t mi-proyecto "claude --dangerously-skip-permissions" Enter

# Dar 10 segundos para que arranque, luego enviar comando:
sleep 10
tmux send-keys -t mi-proyecto "/bios" Enter

# Ver output en tiempo real:
tmux attach -t mi-proyecto
# Ctrl+B, D para desconectar sin cerrar
```

Esperado: el agente ejecuta el protocolo BIOS, reporta estado, queda listo para recibir planes.

### Paso 8: Configurar sync cron

```bash
cp /home/<USUARIO>/sypnose/sync-sypnose.sh ~/scripts/sync-sypnose.sh
chmod +x ~/scripts/sync-sypnose.sh
mkdir -p ~/logs

(crontab -l 2>/dev/null; echo "0 */6 * * * bash ~/scripts/sync-sypnose.sh >> ~/logs/sypnose-sync.log 2>&1") | crontab -

# Verificar:
crontab -l | grep sync-sypnose
```

### Paso 9 (Desktop): Conectar SM desde Windows/Mac

```bash
# 1. Instalar supergateway:
npm install -g supergateway

# 2. Configurar claude_desktop_config.json con los 4 MCPs de prerequisites/MCP-CONFIGS.md

# 3. Abrir Claude Desktop — sypnose-tunnels conecta automaticamente

# 4. Verificar KB accesible:
# En Claude Desktop: usar kb_list y verificar que devuelve entries
```

### Checklist final de instalacion

```
[ ] node --version >= 18
[ ] tmux y git instalados
[ ] curl http://localhost:18791/health -> {"status":"ok"}
[ ] curl http://localhost:8317/ -> {"endpoints":[...]}
[ ] curl http://localhost:8095/health -> {"status":"ok"}
[ ] npm test -> 12/12 passed
[ ] claude mcp list | grep boris -> boris presente
[ ] /bios funciona en al menos un agente
[ ] crontab -l | grep sync-sypnose -> cron configurado
[ ] sm-tmux list -> sesiones activas visibles
```

---

## FASE 2 COMPLETADA: 2026-04-03

- 6 componentes documentados con instalacion paso a paso (Secciones 11-16)
- Knowledge Hub, CLIProxy, Boris, SSE Hub, Channel MCP, sm-tmux
- Paquete corregido: sypnose-v52-corrected.tar.gz (40KB, 21/21 tests)
- 5 subagentes paralelos completaron la documentacion
- Gemini Gate aprobo el plan

### Orden de instalacion en servidor limpio (22 secciones)
1. Node.js >= 18, tmux, git, build-essential (Seccion 2)
2. Knowledge Hub (:18791) — el bus (Seccion 11)
3. CLIProxy (:8317) — router de modelos (Seccion 12)
4. Sypnose v5.2 (/opt/sypnose/) — el coordinator (Secciones 6-10)
5. SSE Hub (:8095) — comunicacion live (Seccion 14)
6. Channel MCP — cliente SSE (Seccion 15)
7. Boris v6.2 — hooks por proyecto (Seccion 13 y 18)
8. sm-tmux — envio de planes (Seccion 16)
9. Crear agentes (tmux + templates + .brain/ + CLAUDE.md) (Secciones 8, 17)
10. Commands y skills (Seccion 19)
11. Sync cron (Seccion 20)
12. Desktop SM (Secciones 21, MCP-CONFIGS.md)
13. Flujo completo end-to-end (Seccion 22)

### Completado en esta fase (Secciones 17-22)
- Templates para nuevos agentes (Seccion 17)
- Boris MCP Server documentado con las 7 tools (Seccion 18)
- Slash commands y skills: 19 commands, 5 skills documentados (Seccion 19)
- Script sync-sypnose.sh con cron cada 6h (Seccion 20)
- Desktop App Windows/Mac con CLAUDE-SM.md y sypnose-tunnels (Seccion 21)
- Flujo completo 9 pasos desde cero con checklist final (Seccion 22)
