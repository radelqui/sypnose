# SYPNOSE — Parte 11: A2A, MsgHub Channels y mejoras de infraestructura

**Version:** 1.0 — 31-Mar-2026
**Commits:** 749bb19, 4bfd92a (repo oc-manual en servidor Contabo)
**Componente:** Knowledge Hub (puerto :18791)

---

## TABLA DE CONTENIDOS

- [11.1 A2A — Agent-to-Agent Direct Messaging](#111-a2a--agent-to-agent-direct-messaging)
- [11.2 MsgHub Channels — Broadcast Pub/Sub](#112-msghub-channels--broadcast-pubsub)
- [11.3 A2A Request Timeout](#113-a2a-request-timeout)
- [11.4 Channel SSE Push](#114-channel-sse-push)
- [11.5 sm-tmux mejoras A2A](#115-sm-tmux-mejoras-a2a)
- [11.6 Hook kb-inbox-check.sh reescrito](#116-hook-kb-inbox-checksh-reescrito)
- [11.7 CLAUDE.md global — Regla 0](#117-claudemd-global--regla-0)
- [11.8 Prompt de instalacion para arquitecto](#118-prompt-de-instalacion-para-arquitecto)

---

## 11.1 A2A — Agent-to-Agent Direct Messaging

### Que es

Antes de A2A, los agentes solo se comunicaban a traves del SM (Service Manager):

```
Agente A → KB task → SM lee → SM envia a Agente B
```

Con A2A, los agentes se hablan directamente:

```
Agente A → POST /a2a/send → Agente B lo lee
```

El SM sigue siendo el unico que puede crear tasks. A2A es solo mensajeria directa — no sustituye la jerarquia, la extiende para coordinacion rapida.

### Tabla SQLite

```sql
CREATE TABLE a2a_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  content TEXT NOT NULL,
  thread_id TEXT,
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Endpoints REST

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/a2a/send` | Enviar mensaje a otro agente |
| GET | `/a2a/messages` | Ver mensajes recibidos por el agente que llama |
| POST | `/a2a/read` | Marcar mensajes como leidos |
| GET | `/a2a/thread` | Ver hilo completo por thread_id |

### Ejemplos curl

**Enviar mensaje de iatrader a oc-manual:**
```bash
curl -X POST http://localhost:18791/a2a/send \
  -H "Content-Type: application/json" \
  -d '{
    "from": "iatrader",
    "to": "oc-manual",
    "content": "Necesito confirmar si el endpoint /a2a/send acepta arrays",
    "thread_id": "coordinacion-2026-03-31"
  }'
```

**Respuesta:**
```json
{ "id": 42, "status": "sent" }
```

**Leer mensajes recibidos (agente oc-manual):**
```bash
curl "http://localhost:18791/a2a/messages?agent=oc-manual"
```

**Respuesta:**
```json
[
  {
    "id": 42,
    "from": "iatrader",
    "content": "Necesito confirmar si el endpoint /a2a/send acepta arrays",
    "thread_id": "coordinacion-2026-03-31",
    "read": 0,
    "created_at": "2026-03-31T14:22:00"
  }
]
```

**Marcar como leido:**
```bash
curl -X POST http://localhost:18791/a2a/read \
  -H "Content-Type: application/json" \
  -d '{"ids": [42]}'
```

**Ver hilo completo:**
```bash
curl "http://localhost:18791/a2a/thread?thread_id=coordinacion-2026-03-31"
```

### MCP tools

| Tool | Descripcion |
|------|-------------|
| `a2a_send` | Envia mensaje directo a otro agente |
| `a2a_messages` | Lee mensajes recibidos por el agente actual |

### Regla de seguridad

**Solo el SM puede crear tasks.** Si un agente intenta crear una task via A2A (campo `type: "task"`), el KB rechaza con 403. A2A es mensajeria, no cadena de mando.

Ejemplo de rechazo:
```json
{ "error": "A2A no puede crear tasks. Solo el SM puede delegar trabajo." }
```

### Inspiracion

Basado en el patron de mensajeria de AgentScope (github.com/agentscope-ai/agentscope), pero implementado sobre el KB existente sin instalar dependencias externas. Se evaluo AgentScope y se decidio NO instalarlo — cherry-pick solo de los patrones A2A y MsgHub.

---

## 11.2 MsgHub Channels — Broadcast Pub/Sub

### Que es

Un sistema de canales donde un agente publica y todos los suscriptores reciben el mensaje. Util para:
- Alertas de sistema que varios agentes necesitan saber
- Notificaciones de deploy que afectan a multiples proyectos
- Datos fiscales que consumen varios consumidores

### Tablas SQLite

```sql
CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE channel_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_name TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(channel_name, agent_name)
);

CREATE TABLE channel_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_name TEXT NOT NULL,
  from_agent TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Canales iniciales del sistema

| Canal | Suscriptores | Uso |
|-------|-------------|-----|
| `system-alerts` | 8 agentes | Alertas criticas de infraestructura |
| `deploy-notifications` | 3 agentes | Notificaciones de deploy completado |
| `fiscal-data` | 3 agentes | Datos DGII y fiscales compartidos |

### Endpoints REST

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/channels/create` | Crear canal nuevo |
| POST | `/channels/publish` | Publicar mensaje en canal |
| GET | `/channels/:name/messages` | Leer mensajes de un canal |
| POST | `/channels/:name/subscribe` | Suscribir agente a canal |
| POST | `/channels/:name/unsubscribe` | Desuscribir agente |
| GET | `/channels/list` | Listar todos los canales |

### Ejemplos curl

**Crear canal:**
```bash
curl -X POST http://localhost:18791/channels/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "system-alerts",
    "description": "Alertas criticas de infraestructura"
  }'
```

**Suscribir agente:**
```bash
curl -X POST http://localhost:18791/channels/system-alerts/subscribe \
  -H "Content-Type: application/json" \
  -d '{"agent": "iatrader"}'
```

**Publicar mensaje:**
```bash
curl -X POST http://localhost:18791/channels/publish \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "system-alerts",
    "from": "seguridad-server",
    "content": "ALERTA: intento de acceso ssh desde IP no autorizada 45.82.x.x"
  }'
```

**Leer mensajes del canal:**
```bash
curl "http://localhost:18791/channels/system-alerts/messages"
```

**Listar canales:**
```bash
curl http://localhost:18791/channels/list
```

### MCP tools

| Tool | Descripcion |
|------|-------------|
| `channel_publish` | Publicar en un canal |
| `channel_read` | Leer mensajes de un canal |

---

## 11.3 A2A Request Timeout

### Que es

Un setInterval que corre cada 60 segundos en el servidor. Busca mensajes A2A que:
1. Son del tipo "request" (esperan respuesta)
2. Llevan mas de 5 minutos sin respuesta

Cuando encuentra uno, auto-notifica al SM via inbox del KB.

### Por que existe

Sin timeout, un agente puede quedar esperando una respuesta que nunca llega (el receptor esta caido, ocupado, o en compact). El timeout garantiza que el SM sabe que hay coordinacion bloqueada.

### Endpoint de debug

```bash
# Ver cuantos timeouts hay ahora mismo
curl http://localhost:18791/a2a/check-timeouts
```

**Respuesta:**
```json
{
  "checked": 12,
  "timed_out": 1,
  "notified_sm": true
}
```

### Comportamiento

- El cron corre cada 60 segundos automaticamente al iniciar el servidor
- Si encuentra timeout → guarda en KB con category=`notification` y to=`sm`
- El SM ve la notificacion en el proximo kb-inbox-check
- No cancela el mensaje A2A — solo alerta al SM para que intervenga

---

## 11.4 Channel SSE Push

### Que es

Cuando un agente publica en un canal, ademas de guardar en SQLite, el servidor hace un POST inmediato al Sypnose Hub (:8095). Los suscriptores que esten conectados via SSE reciben el mensaje en tiempo real sin polling.

### Diagrama

```
Agente publica en canal
        |
POST /channels/publish
        |
  Guarda en SQLite (record permanente)
        |
  POST :8095/notify (SSE push, timeout 2s)
        |
  Sypnose Hub reenvía a suscriptores SSE
        |
  Suscriptores ven mensaje instantaneo
```

### Comportamiento de fallo

Si el hub no responde en 2 segundos:
- El `/channels/publish` **completa normalmente** con 200 OK
- El mensaje queda guardado en SQLite
- Los suscriptores pueden leerlo con polling normal

SQLite es el registro permanente. SSE es el bonus de tiempo real. Uno no depende del otro.

### Configuracion en oc-manual

El servidor envia el POST al hub usando la variable de entorno `SYPNOSE_HUB_URL`:

```bash
# En el .env del proyecto oc-manual
SYPNOSE_HUB_URL=http://localhost:8095
```

Si no esta configurada, el push SSE simplemente se omite.

---

## 11.5 sm-tmux mejoras A2A

### Nuevos comandos

Commit 4bfd92a anade soporte A2A a sm-tmux. En progreso al 31-Mar-2026.

| Comando | Descripcion |
|---------|-------------|
| `sm-tmux a2a <sesion> <mensaje>` | Enviar mensaje A2A directo al arquitecto de esa sesion |
| `sm-tmux a2a-inbox` | Ver mensajes A2A dirigidos al SM |
| `sm-tmux a2a-reply <id> <mensaje>` | Responder a un mensaje A2A por su ID |

### Uso tipico del SM

```bash
# Ver si hay mensajes de arquitectos
sm-tmux a2a-inbox

# Responder a mensaje ID 42
sm-tmux a2a-reply 42 "Confirmado, procede con el fix"

# Enviar mensaje directo a arquitecto en sesion iatrader
sm-tmux a2a iatrader "Cuando termines la wave 1, notificame por A2A antes de continuar"
```

### Estado

En progreso — los comandos estan en el codigo pero pendiente de prueba completa segun sesion 31-Mar-2026.

---

## 11.6 Hook kb-inbox-check.sh reescrito

### Que cambio

**Antes (logica antigua):**
```bash
# Leia lista de keys del KB
keys=$(kb_list category=notification)
# Comparaba contra archivo seen.txt local
grep -q "$key" ~/.brain/kb-hook-seen.txt
# Si no estaba → mostrar, agregar a seen.txt
```

Problemas:
- seen.txt crecía indefinidamente
- Si seen.txt se borraba, todas las notificaciones antiguas reaparecian
- Requeria mantenimiento manual del archivo

**Ahora (logica nueva):**
```bash
# Llama al endpoint dedicado del KB
curl http://localhost:18791/api/inbox/check?agent=sm-claude-web

# El KB devuelve solo las no-leidas
# Despues de mostrar cada una:
curl -X POST http://localhost:18791/api/inbox/ack \
  -d '{"id": N}'

# El KB marca como leida en su propia base de datos
```

### Ventajas

- Las notificaciones aparecen exactamente 1 vez y desaparecen
- No hay archivo local que gestionar
- El estado "leido/no-leido" vive en el KB (fuente de verdad)
- Funciona aunque se resetee el contexto o se borre cualquier archivo local

### Ruta del archivo

```
C:/memoria-permanente/.claude/hooks/kb-inbox-check.sh
```

### Estructura del hook (pseudocodigo)

```bash
#!/bin/bash
# kb-inbox-check.sh — version post 31-Mar-2026

INBOX=$(curl -s "http://localhost:18791/api/inbox/check?agent=sm-claude-web")

# Para cada notificacion no leida
for notif in $INBOX; do
  echo "=== NOTIFICACION KB ==="
  echo "$notif"
  echo "======================="

  # Auto-ack inmediato
  ID=$(echo "$notif" | jq .id)
  curl -s -X POST http://localhost:18791/api/inbox/ack \
    -H "Content-Type: application/json" \
    -d "{\"id\": $ID}" > /dev/null
done
```

---

## 11.7 CLAUDE.md global — Regla 0

### Que se anadio

El CLAUDE.md global (`C:\Users\carlo\.claude\CLAUDE.md`) tiene ahora una Regla #0 que obliga a todos los clientes (Claude Desktop y Claude Code Web) a revisar el inbox al arrancar:

```markdown
## REGLA #0 — NOTIFICACIONES AL ARRANCAR (TODOS LOS CLIENTES)
Al iniciar sesion, llamar `kb_inbox_check for=sm-claude-web` para ver notificaciones pendientes de arquitectos.
Hacer `kb_inbox_ack id=N` para cada notificacion leida — asi no se repiten.
```

### Por que

Sin la Regla #0, el SM podia pasar horas sin enterarse de que un arquitecto termino una tarea. Las notificaciones quedaban en el inbox sin leer hasta que el hook las mostraba en el siguiente mensaje.

Con la Regla #0, el SM ve el estado del sistema en los primeros segundos de cada sesion.

---

## 11.8 Prompt de instalacion para arquitecto

Esta seccion es el prompt que el SM envia a un arquitecto nuevo para instalar A2A y Channels en un proyecto que ya tiene Knowledge Hub.

### Prerequisito

El proyecto debe tener ya instalado:
- Knowledge Hub funcionando en :18791
- oc-manual actualizado (commit >= 749bb19)

Verificar:
```bash
curl http://localhost:18791/health
# Respuesta esperada: { "status": "ok", "version": "..." }
```

---

### PROMPT SM → ARQUITECTO (copiar y enviar via sm-tmux send)

```
PLAN: Instalar A2A + MsgHub Channels en Knowledge Hub
TASK: Implementar mensajeria directa entre agentes y sistema de canales broadcast

CONTEXTO:
El Knowledge Hub ya esta corriendo en :18791. Necesitamos anadir dos sistemas nuevos:
1. A2A (Agent-to-Agent Direct Messaging) — mensajes directos entre agentes
2. MsgHub Channels — broadcast pub/sub donde un agente publica y todos los suscriptores reciben

Los commits de referencia estan en el repo oc-manual: 749bb19 y 4bfd92a.

WAVE 1 — Anadir tablas SQLite (sin deps externas)

Anadir al archivo de inicializacion del KB estas tres tablas si no existen:

```sql
CREATE TABLE IF NOT EXISTS a2a_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  content TEXT NOT NULL,
  thread_id TEXT,
  message_type TEXT DEFAULT 'message',
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channel_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_name TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(channel_name, agent_name)
);

CREATE TABLE IF NOT EXISTS channel_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_name TEXT NOT NULL,
  from_agent TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Verificacion wave 1: sqlite3 /ruta/kb.db ".tables" — debe mostrar las 4 tablas nuevas.
Evidencia: output del comando sqlite3 con las tablas listadas.

WAVE 2 — Anadir endpoints A2A al servidor KB

En el archivo principal del servidor (server.js o similar), anadir estos 4 endpoints:

POST /a2a/send
- Body: { from, to, content, thread_id? }
- Seguridad: si body contiene type="task" → responder 403 con error "Solo el SM puede crear tasks"
- Guardar en a2a_messages
- Responder: { id, status: "sent" }

GET /a2a/messages
- Query param: agent (el receptor)
- Devolver mensajes donde to_agent=agent ordenados por created_at DESC
- Incluir campo read

POST /a2a/read
- Body: { ids: [1, 2, 3] }
- Marcar esos IDs como read=1
- Responder: { updated: N }

GET /a2a/thread
- Query param: thread_id
- Devolver todos los mensajes del hilo ordenados por created_at ASC

Verificacion wave 2:
```bash
# Enviar mensaje de prueba
curl -X POST http://localhost:18791/a2a/send \
  -H "Content-Type: application/json" \
  -d '{"from":"test-a","to":"test-b","content":"hola desde wave 2"}'
# Debe responder: {"id":1,"status":"sent"}

# Leer el mensaje
curl "http://localhost:18791/a2a/messages?agent=test-b"
# Debe devolver el mensaje enviado
```
Evidencia: output de ambos curl con los resultados esperados.

WAVE 3 — Anadir endpoints Channels

Anadir estos 6 endpoints:

POST /channels/create
- Body: { name, description? }
- INSERT en channels
- Si ya existe → responder 409 con error descriptivo

POST /channels/publish
- Body: { channel, from, content }
- INSERT en channel_messages
- Opcional: si SYPNOSE_HUB_URL existe en env, hacer POST al hub con timeout 2s
  Si el hub falla, completar normalmente (SQLite es el record, SSE es el bonus)
- Responder: { id, status: "published" }

GET /channels/:name/messages
- Devolver mensajes del canal ordenados por published_at DESC
- Limit 50 por defecto

POST /channels/:name/subscribe
- Body: { agent }
- INSERT OR IGNORE en channel_subscribers
- Responder: { status: "subscribed" }

POST /channels/:name/unsubscribe
- Body: { agent }
- DELETE de channel_subscribers donde channel_name=name AND agent_name=agent
- Responder: { status: "unsubscribed" }

GET /channels/list
- Devolver todos los canales con conteo de suscriptores

Verificacion wave 3:
```bash
# Crear canal
curl -X POST http://localhost:18791/channels/create \
  -H "Content-Type: application/json" \
  -d '{"name":"test-channel","description":"canal de prueba"}'

# Suscribir agente
curl -X POST http://localhost:18791/channels/test-channel/subscribe \
  -H "Content-Type: application/json" \
  -d '{"agent":"gestoriard"}'

# Publicar
curl -X POST http://localhost:18791/channels/publish \
  -H "Content-Type: application/json" \
  -d '{"channel":"test-channel","from":"iatrader","content":"mensaje de prueba wave 3"}'

# Leer
curl http://localhost:18791/channels/test-channel/messages
# Debe devolver el mensaje publicado
```
Evidencia: output del ultimo curl mostrando el mensaje publicado.

WAVE 4 — Crear canales iniciales del sistema

Una vez que los endpoints funcionan, crear los 3 canales base con sus suscriptores:

```bash
# Crear canales
curl -X POST http://localhost:18791/channels/create \
  -d '{"name":"system-alerts","description":"Alertas criticas de infraestructura"}'
curl -X POST http://localhost:18791/channels/create \
  -d '{"name":"deploy-notifications","description":"Notificaciones de deploy completado"}'
curl -X POST http://localhost:18791/channels/create \
  -d '{"name":"fiscal-data","description":"Datos DGII y fiscales compartidos"}'

# Suscribir arquitectos a system-alerts
for agent in iatrader iatrader-rust gestoriard facturaia seguridad-server dgii-scraper oc-manual sm; do
  curl -s -X POST http://localhost:18791/channels/system-alerts/subscribe \
    -H "Content-Type: application/json" \
    -d "{\"agent\":\"$agent\"}"
done

# Suscribir a deploy-notifications
for agent in gestoriard facturaia oc-manual; do
  curl -s -X POST http://localhost:18791/channels/deploy-notifications/subscribe \
    -H "Content-Type: application/json" \
    -d "{\"agent\":\"$agent\"}"
done

# Suscribir a fiscal-data
for agent in gestoriard dgii-scraper oc-manual; do
  curl -s -X POST http://localhost:18791/channels/fiscal-data/subscribe \
    -H "Content-Type: application/json" \
    -d "{\"agent\":\"$agent\"}"
done
```

Verificacion wave 4:
```bash
curl http://localhost:18791/channels/list
# Debe mostrar 3 canales con sus conteos de suscriptores (8, 3, 3)
```
Evidencia: output del channels/list con los 3 canales y suscriptores correctos.

WAVE 5 — A2A Timeout watchdog

Anadir un setInterval que corre cada 60 segundos. Busca mensajes en a2a_messages donde:
- message_type = 'request' (espera respuesta)
- read = 0
- created_at < NOW() - 5 minutes

Para cada uno, crear una notificacion en el KB:
```
category: notification
to: sm
content: "A2A TIMEOUT: mensaje ID X de [from] a [to] lleva mas de 5min sin respuesta"
```

Anadir tambien el endpoint de debug:
GET /a2a/check-timeouts
- Ejecuta la misma logica manualmente
- Responde: { checked: N, timed_out: N, notified_sm: true/false }

El setInterval arranca automaticamente al iniciar el servidor.

Verificacion wave 5:
```bash
curl http://localhost:18791/a2a/check-timeouts
# Debe responder JSON con los campos checked, timed_out, notified_sm
```
Evidencia: output del curl con respuesta JSON valida.

MODEL: sonnet (waves 1-3), qwen (waves 4-5)
BORIS: commit + verificacion + evidencia despues de cada wave
VERIFICACION: curl en cada endpoint antes de marcar wave como DONE

Mejora este documento. Añade lo que falte. Si encuentras algo mal o un falso positivo, corrigelo. Tu conoces el codigo mejor que nosotros.
```

---

## Referencia rapida — todos los endpoints nuevos

### A2A

```
POST   /a2a/send                    — Enviar mensaje
GET    /a2a/messages?agent=X        — Leer mensajes recibidos
POST   /a2a/read                    — Marcar como leido
GET    /a2a/thread?thread_id=X      — Ver hilo
GET    /a2a/check-timeouts          — Debug timeout watchdog
```

### Channels

```
POST   /channels/create             — Crear canal
POST   /channels/publish            — Publicar en canal
GET    /channels/:name/messages     — Leer mensajes de canal
POST   /channels/:name/subscribe    — Suscribir agente
POST   /channels/:name/unsubscribe  — Desuscribir agente
GET    /channels/list               — Listar todos los canales
```

### MCP tools nuevos

```
a2a_send          — Enviar mensaje A2A
a2a_messages      — Leer mensajes A2A recibidos
channel_publish   — Publicar en canal
channel_read      — Leer mensajes de canal
```

---

*Implementado en sesion 31-Mar-2026. Commits 749bb19 y 4bfd92a en repo oc-manual.*
*Hook kb-inbox-check.sh reescrito en la misma sesion — ahora usa /api/inbox/check con auto-ack.*
