# Instalar SM Sypnose en cualquier PC del mundo

Guía para que un Claude Code CLI se convierta en Service Manager de Sypnose.
Escrita de Code a Code. Sigue los 10 pasos en orden.

---

## Paso 1 — Instalar Claude Code CLI

**Mac/Linux:**
```bash
curl -fsSL https://claude.ai/install.sh | sh
```

**Windows (PowerShell):**
```powershell
irm https://claude.ai/install.ps1 | iex
```

## Paso 2 — Activar con tu suscripción Claude

Claude Code funciona con suscripción Claude (Pro $20/mes, Max $100/mes). No necesitas API key.

```bash
claude login
```

Se abre el navegador. Login con tu cuenta Claude (email + password). Listo.

Si prefieres API key (empresas/equipos):
```bash
claude config set apiKey sk-ant-XXXXXX
```

## Paso 3 — Crear directorio de trabajo
```bash
mkdir ~/sypnose-sm && cd ~/sypnose-sm
git init
```

## Paso 4 — SSH key para el servidor Sypnose

El servidor central es donde viven los arquitectos, el KB y los proyectos. Necesitas acceso SSH. Pide al administrador que añada tu pubkey.

```bash
ssh-keygen -t ed25519
cat ~/.ssh/id_ed25519.pub
# Envía esta clave pública al administrador del servidor
# El administrador la añade a ~/.ssh/authorized_keys en el servidor
```

Verificar acceso:
```bash
ssh -p 2024 gestoria@IP_SERVIDOR "echo OK"
```

## Paso 5 — Túneles SSH (conectan al servidor)

Estos túneles dan acceso a los servicios internos del servidor desde tu PC local:

```bash
ssh -L 18791:localhost:18791 -L 8317:localhost:8317 -L 8095:localhost:8095 -p 2024 gestoria@IP_SERVIDOR -N &
```

| Puerto local | Servicio | Para qué |
|---|---|---|
| 18791 | Knowledge Hub | Memoria compartida de todos los agentes |
| 8317 | SypnoseProxy (CLIProxyAPI) | 46 modelos IA (Qwen gratis, Gemini, Claude, etc.) |
| 8095 | Sypnose Hub | Notificaciones live via SSE |

Verificar que funcionan:
```bash
curl -s http://localhost:18791/health | jq .
curl -s http://localhost:8317/v1/models | head -5
curl -s http://localhost:8095/health | jq .
```

## Paso 6 — Configurar MCP Knowledge Hub

Crear `.claude/settings.json` en tu directorio de trabajo:

```json
{
  "mcpServers": {
    "knowledge-hub": {
      "command": "npx",
      "args": ["-y", "supergateway", "--sse", "http://localhost:18791/sse"]
    }
  },
  "permissions": {
    "allow": [
      "Bash(ssh:*)",
      "mcp__knowledge-hub__*",
      "Read",
      "Write",
      "Glob",
      "Grep",
      "WebSearch",
      "WebFetch"
    ]
  }
}
```

Requisito: Node.js instalado (para npx). Si no lo tienes:
- Mac: `brew install node`
- Linux: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash && sudo apt install -y nodejs`
- Windows: descarga desde nodejs.org

## Paso 7 — CLAUDE.md (identidad SM)

Crear `CLAUDE.md` en la raíz de tu directorio de trabajo:

```markdown
# IDENTIDAD — SERVICE MANAGER SYPNOSE

Eres el Service Manager (SM) de Sypnose.
Tu trabajo: COORDINAR, no programar.

## Servidor
- IP: [IP_DEL_SERVIDOR]
- SSH: puerto 2024, usuario gestoria
- Acceso: solo via túnel SSH

## Herramientas
- **KB**: kb_list, kb_read, kb_save, kb_search, kb_inbox_check, kb_inbox_ack
- **SSH**: ssh -p 2024 gestoria@IP "comando"
- **sm-tmux**: ssh ... "sm-tmux send SESION PLAN" para enviar planes a arquitectos
- **Gemini Gate**: sm-tmux approve SESION (valida planes automáticamente)

## Flujo de trabajo
1. /bios → arrancar sesión, leer estado, notificaciones
2. kb_inbox_check for=sm-claude-web → ver qué reportaron los arquitectos
3. Crear plan con /sypnose-create-plan → mostrar a Carlos → Carlos aprueba
4. kb_save plan → sm-tmux send + approve → arquitecto ejecuta
5. Verificar resultado → ciclo mejoras hasta "TODO PERFECTO"
6. Documentar en memoria

## Reglas inquebrantables
1. NUNCA programar — delegar a arquitectos via planes
2. NUNCA enviar plan sin aprobación de Carlos
3. Boris: sin evidencia no existe — cada wave necesita prueba real
4. Modelos baratos (qwen3-coder-plus gratis) para todo excepto código core crítico
5. Al terminar cada plan: preguntar mejoras hasta "TODO PERFECTO"
6. Gemini Gate valida TODO — nunca bypass
```

## Paso 8 — Skills (slash commands)

Descargar desde el repo Sypnose:

```bash
mkdir -p .claude/commands

# /bios — arranque de sesión
curl -o .claude/commands/bios.md \
  https://raw.githubusercontent.com/radelqui/sypnose/main/skills/bios.md

# /sypnose-create-plan — protocolo para crear planes
curl -o .claude/commands/sypnose-create-plan.md \
  https://raw.githubusercontent.com/radelqui/sypnose/main/skills/sypnose-create-plan.md
```

Verificar:
```bash
ls .claude/commands/
# Debe mostrar: bios.md  sypnose-create-plan.md
```

## Paso 9 — Hook de notificaciones automáticas

Crear `.claude/hooks/kb-inbox-check.sh`:

```bash
#!/bin/bash
# Hook: muestra notificaciones KB y auto-ack
INBOX=$(curl -s --connect-timeout 1 --max-time 2 \
    "http://localhost:18791/api/inbox/check?for=sm-claude-web&limit=10" 2>/dev/null)
[ -z "$INBOX" ] && exit 0
UNREAD=$(echo "$INBOX" | jq -r '.unread // 0' 2>/dev/null)
[ -z "$UNREAD" ] || [ "$UNREAD" = "0" ] && exit 0
COUNT=$(echo "$INBOX" | jq '.messages | length' 2>/dev/null)
[ -z "$COUNT" ] || [ "$COUNT" = "0" ] && exit 0
echo "=== KB NOTIFICACIONES ($UNREAD pendientes) ==="
for i in $(seq 0 $((COUNT-1))); do
    ID=$(echo "$INBOX" | jq -r ".messages[$i].id // 0" 2>/dev/null)
    SENDER=$(echo "$INBOX" | jq -r ".messages[$i].sender // \"?\"" 2>/dev/null)
    MSG=$(echo "$INBOX" | jq -r ".messages[$i].message // \"\"" 2>/dev/null)
    TS_RAW=$(echo "$INBOX" | jq -r ".messages[$i].created_at // \"\"" 2>/dev/null)
    if [ -n "$TS_RAW" ]; then
        TS="[$(echo "$TS_RAW" | sed 's/T/ /' | cut -c12-16)]"
    else
        TS="[--:--]"
    fi
    echo "${TS} [${SENDER}] $(echo "$MSG" | tr '\n' ' ' | cut -c1-120)"
    [ "$ID" != "0" ] && curl -s --connect-timeout 1 --max-time 1 \
        -X POST "http://localhost:18791/api/inbox/ack" \
        -H "Content-Type: application/json" \
        -d "{\"id\":$ID}" > /dev/null 2>&1 &
done
wait
echo "=== FIN (auto-ack: $COUNT leidas) ==="
```

Añadir el hook a `.claude/settings.json`:
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/kb-inbox-check.sh",
            "timeout": 10000
          }
        ]
      }
    ]
  }
}
```

Requisito: `jq` instalado. Si no: `sudo apt install jq` (Linux) o `brew install jq` (Mac).

## Paso 10 — Arrancar

```bash
cd ~/sypnose-sm
claude
```

Dentro de Claude Code:
```
/bios
```

El SM arranca, lee memoria del KB, ve notificaciones de arquitectos, y está operativo.

---

## Estructura final del directorio

```
~/sypnose-sm/
├── CLAUDE.md                          ← identidad SM
├── .claude/
│   ├── settings.json                  ← MCP + permisos + hooks
│   ├── commands/
│   │   ├── bios.md                    ← /bios
│   │   └── sypnose-create-plan.md     ← /sypnose-create-plan
│   └── hooks/
│       └── kb-inbox-check.sh          ← notificaciones auto-ack
└── .git/
```

## Requisitos resumen

| Requisito | Necesario |
|---|---|
| Claude Code CLI | Sí (instalador oficial) |
| Suscripción Claude | Sí (Pro $20 o Max $100) |
| Node.js | Sí (para npx supergateway) |
| jq | Sí (para hook notificaciones) |
| SSH key autorizada | Sí (el admin del servidor la añade) |
| Internet | Sí (SSH al servidor) |

## Cómo enviar trabajo a arquitectos

Desde el SM, para enviar un plan a un arquitecto:

```bash
# 1. Crear plan y guardar en KB
ssh -p 2024 gestoria@IP "curl -s -X POST http://localhost:18791/api/save \
  -H 'Content-Type: application/json' \
  -d '{\"key\":\"task-PROYECTO-NOMBRE-FECHA\",\"category\":\"task\",\"project\":\"PROYECTO\",\"value\":\"PLAN AQUI\"}'"

# 2. Enviar via sm-tmux (incluye Gemini Gate)
ssh -p 2024 gestoria@IP "sm-tmux send SESION_TMUX 'kb_read key=task-PROYECTO-NOMBRE-FECHA project=PROYECTO && echo EJECUTA'"
```

sm-tmux valida con Gemini automáticamente. Si rechaza, corregir y reenviar.

## Soporte

- Repo: github.com/radelqui/sypnose
- Manual completo: MANUAL-SYPNOSE.md (6100 líneas, 10 partes)
- Documentación A2A + MsgHub: PART-11-A2A-CHANNELS.md
