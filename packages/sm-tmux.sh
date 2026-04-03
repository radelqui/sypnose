#!/bin/bash
# sm-tmux — Wrapper restringido para SM de OpenClaw
# v5: inbox, ack, reply — sistema de mensajería

PENDING_DIR="$HOME/.openclaw/pending-plans"
LOG_FILE="$HOME/.openclaw/sm-tmux.log"
CACHE_DIR="$HOME/.openclaw/plan-cache"
mkdir -p "$PENDING_DIR"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$CACHE_DIR"

# Limpiar cache vieja (>10 min)
find "$CACHE_DIR" -name "*.approved" -mmin +10 -delete 2>/dev/null

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# CLIProxy API key (leer de env var o archivo de config)
if [ -f "$HOME/.config/sm-tmux.env" ]; then
    source "$HOME/.config/sm-tmux.env"
fi
API_KEY="${CLIPROXY_API_KEY:-}"
if [ -z "$API_KEY" ]; then
    # Fallback: leer de archivo si existe
    API_KEY=$(cat "$HOME/.config/cliproxy-api-key" 2>/dev/null || echo "")
fi

# Función de log de auditoría
log_entry() {
  local SESSION="$1"
  local ACTION="$2"
  local GEMINI_STATUS="$3"
  local SENT="$4"
  local PLAN_TEXT="$5"
  local TIMESTAMP
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  local PLAN_PREVIEW
  PLAN_PREVIEW=$(echo "$PLAN_TEXT" | head -1 | cut -c1-80)
  echo "[$TIMESTAMP] SESSION=$SESSION ACTION=$ACTION GEMINI=$GEMINI_STATUS SENT=$SENT PLAN_PREVIEW=$PLAN_PREVIEW" >> "$LOG_FILE"
}

# Función para detectar estado de terminal tmux
get_terminal_state() {
    local SESSION="$1"
    /usr/bin/tmux has-session -t "$SESSION" 2>/dev/null || { echo "OFFLINE"; return; }

    # Capturar últimas 5 líneas
    local LAST_LINES
    LAST_LINES=$(/usr/bin/tmux capture-pane -t "$SESSION" -p 2>/dev/null | tail -5)

    if [ -z "$LAST_LINES" ]; then
        echo "IDLE"
        return
    fi

    # Detectar error
    if echo "$LAST_LINES" | grep -qiE "error|traceback|failed|panic|fatal"; then
        echo "ERROR"
        return
    fi

    # Detectar esperando input (prompt visible — última línea corta sin output de proceso)
    local LAST_LINE
    LAST_LINE=$(echo "$LAST_LINES" | tail -1)
    if echo "$LAST_LINE" | grep -qE '^\$|^>|^#|^claude|^gestoria|human>|❯'; then
        echo "IDLE"
        return
    fi

    # Si hay output reciente, está trabajando
    echo "WORKING"
}

case "$1" in
  list)
    /usr/bin/tmux list-sessions 2>/dev/null || echo "No hay sesiones tmux activas"
    ;;

  send)
    # Parsear flags --force, --dry-run y --broadcast antes de sesion/plan
    shift  # quitar "send"
    FORCE=0
    DRYRUN=0
    BROADCAST=0
    while true; do
      case "$1" in
        --force) FORCE=1; shift ;;
        --dry-run) DRYRUN=1; shift ;;
        --broadcast) BROADCAST=1; shift ;;
        *) break ;;
      esac
    done

    # BROADCAST: no necesita SESSION — envía a todas las sesiones activas
    if [ "$BROADCAST" = "1" ]; then
      PLAN="$1"
      if [ -z "$PLAN" ]; then
        echo "Uso: sm-tmux send --broadcast <plan>"
        exit 1
      fi
      SESSIONS=$(/usr/bin/tmux list-sessions -F '#{session_name}' 2>/dev/null)
      if [ -z "$SESSIONS" ]; then
        echo "No hay sesiones tmux activas"
        exit 1
      fi
      for SESSION in $SESSIONS; do
        echo -e "[broadcast] Enviando a $SESSION..."
        "$0" send "$SESSION" "$PLAN"
        echo ""
      done
      exit 0
    fi

    SESSION="$1"
    PLAN="$2"

    if [ -z "$SESSION" ] || [ -z "$PLAN" ]; then
      echo "Uso: sm-tmux send [--force|--dry-run|--broadcast] <sesion> <plan>"
      exit 1
    fi

    # Verificar que la sesión tmux existe
    /usr/bin/tmux has-session -t "$SESSION" 2>/dev/null || { echo "ERROR: sesión '$SESSION' no existe"; exit 1; }

    # --- KB content resolution ---
    ORIGINAL_PLAN="$PLAN"
    if echo "$PLAN" | grep -q "kb_read key="; then
        KB_KEY=$(echo "$PLAN" | grep -oP 'kb_read key=\K[^ ]+' | head -1)
        KB_PROJECT=$(echo "$PLAN" | grep -oP 'project=\K[^ ]+' | head -1)
        if [ -n "$KB_KEY" ]; then
            echo "[sm-tmux send] Detectado kb_read key=$KB_KEY project=$KB_PROJECT"
            echo "[KB] Leyendo contenido real del KB..."
            KB_CONTENT=$(curl -s --max-time 10 "http://localhost:18791/api/read?key=${KB_KEY}&project=${KB_PROJECT}" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('entry',{}).get('value',''))" 2>/dev/null)
            if [ -n "$KB_CONTENT" ]; then
                PLAN="$KB_CONTENT"
            else
                echo "WARN: No se pudo leer KB key=$KB_KEY — validando texto original"
            fi
        fi
    fi
    # --- fin KB resolution ---

    GEMINI_PROMPT="Eres un VALIDADOR SEMANTICO de planes Boris. Validas ESTRUCTURA, COMPLETITUD y EVIDENCIA.

El plan DEBE contener estas 7 etiquetas LITERALES como lineas separadas (case-insensitive):
  PLAN: (seguido de nombre descriptivo, minimo 10 caracteres)
  TAREA: (seguido de texto descriptivo, minimo 10 caracteres)
  MODELO: (seguido de un nombre de modelo valido, ej: claude-opus-4-6, claude-sonnet-4-6, gemini-2.5-flash)
  BORIS: (seguido de un punto de retorno APROPIADO al tipo de trabajo — ver reglas abajo)
  VERIFICACION: (seguido de un comando o metodo concreto POR TIPO — ver reglas abajo)
  EVIDENCIA: (seguido de descripcion del output esperado, minimo 10 caracteres)
  KB: (seguido de texto que contenga LITERALMENTE 'kb_save' Y un key descriptivo)

REGLAS PARA BORIS (punto de retorno por tipo):
- Codigo/feature/fix: DEBE mencionar 'git pull' Y ('git tag' o 'tag pre-')
- Docker/deploy/container: DEBE mencionar 'docker commit' o 'docker save' o 'backup' o 'snapshot'
- Config/infra/nginx/systemd: DEBE mencionar 'backup' o 'cp ' o 'tar ' (backup del archivo de config)
- Reporte/consulta/lectura/analisis/audit: DEBE mencionar 'solo lectura' o 'read-only' o 'no modifica' o 'no changes'
- Si no encaja en ningun tipo Y no tiene justificacion -> RECHAZADO

REGLAS BORIS POR WAVE (CRITICO):
- Si el plan tiene multiples waves (Wave 1, Wave 2, etc.):
  * CADA wave DEBE tener su propio bloque: commit, verificacion con comando real, evidencia con output esperado
  * Si falta: 'Si falla' o rollback en alguna wave -> ADVERTENCIA
  * Si solo hay 1 BORIS global para N waves sin verificacion intermedia -> RECHAZADO (motivo: sin checkpoints)
- Si el plan tiene 1 sola wave, BORIS global es aceptable

REGLAS VERIFICACION POR TIPO (CRITICO):
- FRONTEND (.tsx/.jsx/.html/.css/.vue, UI, modal, formulario, pagina, componente):
  * VERIFICACION DEBE mencionar: Chrome MCP, navegador, screenshot, take_screenshot, 'navegar a', browser, visual
  * Si solo dice 'grep', 'curl', 'test' para cambios de UI -> RECHAZADO (motivo: frontend necesita verificacion visual)
- BACKEND (API, endpoint, query, migration, .py, .rs, .go):
  * VERIFICACION DEBE mencionar: curl con URL, pytest, cargo test, query SQL, health endpoint, status code
  * Si solo dice 'verificar que funciona' o 'probar' sin comando -> RECHAZADO (motivo: evidencia vaga)
- INFRA (systemd, nginx, docker, firewall, config):
  * VERIFICACION DEBE mencionar: systemctl status, docker ps, curl health, ufw status, bash -n, ss -tlnp
  * Si solo dice 'deberia funcionar' -> RECHAZADO
- DOCS/REPORTE (solo lectura, .md, audit):
  * VERIFICACION puede ser: ls, wc -l, grep, cat | head (comandos de lectura)

QUIEN DECIDE (opcional pero recomendado):
- Si alguna wave dice 'Quien decide: Carlos' o 'Quien decide: arquitecto' -> BIEN
- Si falta en todas las waves -> ADVERTENCIA (no rechazar, solo mencionar)

REGLAS ESTRICTAS:
- Si falta CUALQUIER etiqueta de las 7 -> RECHAZADO
- Si una etiqueta existe pero su contenido es vago -> RECHAZADO
- Si BORIS no tiene punto de retorno apropiado al tipo de trabajo -> RECHAZADO
- Si KB no menciona literalmente 'kb_save' -> RECHAZADO
- Narrativa libre NO cuenta. Solo texto despues de las etiquetas.
- NO interpretes, NO inferir, NO asumir. Si no esta ESCRITO, no existe.

Responde EXACTAMENTE en este formato (maximo 5 lineas):
APROBADO (si tiene las 7 etiquetas con contenido valido)
o
RECHAZADO: [lista de problemas encontrados]
o
APROBADO CON ADVERTENCIAS: [lista de advertencias menores]

PLAN:
$PLAN"

    API_URL="http://localhost:8317/v1/chat/completions"
    # API_KEY loaded from env (ver inicio del script)

    call_gemini() {
      local max_time="$1"
      local FALLBACK_MODELS=("gemini-2.5-flash" "gemini-2.5-flash-lite" "qwen3-coder-plus")
      local response
      for model in "${FALLBACK_MODELS[@]}"; do
        response=$(curl -s --max-time "$max_time" \
          -H "Authorization: Bearer $API_KEY" \
          -H "Content-Type: application/json" \
          -d "$(jq -n --arg model "$model" --arg content "$GEMINI_PROMPT" \
            '{"model":$model,"messages":[{"role":"user","content":$content}],"max_tokens":300}')" \
          "$API_URL" 2>/dev/null)
        local err_code
        err_code=$(echo "$response" | jq -r '.error.code // empty' 2>/dev/null)
        if [ "$err_code" != "model_cooldown" ]; then
          echo "$response"
          return 0
        fi
      done
      echo "$response"
    }

    if [ "$FORCE" = "1" ]; then
      # --force: saltar Gemini, enviar directo
      /usr/bin/tmux send-keys -t "$SESSION" -l "$ORIGINAL_PLAN"
      /usr/bin/tmux send-keys -t "$SESSION" "" Enter
      echo ""
      echo -e "${YELLOW}ENVIADO (--force, sin Gemini) a '$SESSION'${NC}"
      echo "$ORIGINAL_PLAN" > "$PENDING_DIR/${SESSION}-last.plan"
      log_entry "$SESSION" "send-force" "SKIP" "yes" "$ORIGINAL_PLAN"

    elif [ "$DRYRUN" = "1" ]; then
      # --dry-run: validar con Gemini pero NO enviar
      echo -e "${CYAN}[sm-tmux send] [DRY-RUN] Validando con Gemini (no se enviará)...${NC}"
      RESPONSE=$(call_gemini 20)
      VERDICT=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty' 2>/dev/null | head -3)

      if [ -z "$VERDICT" ]; then
        echo -e "${CYAN}[DRY-RUN] [Gemini] Sin respuesta (timeout)${NC}"
        log_entry "$SESSION" "send-dryrun" "TIMEOUT" "no" "$ORIGINAL_PLAN"
      elif echo "$VERDICT" | grep -qi "RECHAZADO"; then
        echo -e "${CYAN}[DRY-RUN]${NC} ${RED}[Gemini] $VERDICT${NC}"
        log_entry "$SESSION" "send-dryrun" "RECHAZADO" "no" "$ORIGINAL_PLAN"
      else
        echo -e "${CYAN}[DRY-RUN]${NC} ${GREEN}[Gemini] $VERDICT${NC}"
        log_entry "$SESSION" "send-dryrun" "APROBADO" "no" "$ORIGINAL_PLAN"
      fi
      echo ""
      echo -e "${CYAN}[DRY-RUN] Plan NO enviado a '$SESSION'${NC}"

    else
      # Validar con Gemini automáticamente

      # --- Plan caching: verificar si ya fue aprobado recientemente ---
      PLAN_HASH=$(echo "$PLAN" | sha256sum | cut -d' ' -f1)
      CACHE_FILE="$CACHE_DIR/${PLAN_HASH}.approved"
      if [ -f "$CACHE_FILE" ]; then
        CACHE_TS=$(cat "$CACHE_FILE")
        NOW=$(date +%s)
        DIFF=$((NOW - CACHE_TS))
        if [ "$DIFF" -lt 300 ]; then
          echo -e "${GREEN}[Gemini] APROBADO (cache — validado hace ${DIFF}s)${NC}"
          /usr/bin/tmux send-keys -t "$SESSION" -l "$ORIGINAL_PLAN"
          /usr/bin/tmux send-keys -t "$SESSION" "" Enter
          echo "$ORIGINAL_PLAN" > "$PENDING_DIR/${SESSION}-last.plan"
          echo ""
          echo -e "${GREEN}APROBADO Y ENVIADO a '$SESSION' (cache)${NC}"
          log_entry "$SESSION" "send" "CACHED" "yes" "$ORIGINAL_PLAN"
          exit 0
        fi
      fi
      # --- fin plan caching ---

      echo "[sm-tmux send] Validando con Gemini..."
      RESPONSE=$(call_gemini 20)
      VERDICT=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty' 2>/dev/null | head -3)

      # Retry automático si VERDICT vacío (timeout)
      if [ -z "$VERDICT" ]; then
        echo "[sm-tmux send] Gemini no respondió. Reintentando (1/1)..."
        sleep 2
        RESPONSE=$(call_gemini 25)
        VERDICT=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty' 2>/dev/null | head -3)
      fi

      # Tras retry: fallback o procesar veredicto
      if [ -z "$VERDICT" ]; then
        TIMESTAMP=$(date '+%Y%m%d%H%M%S')
        echo "$ORIGINAL_PLAN" > "$PENDING_DIR/${SESSION}-${TIMESTAMP}.plan"
        echo -e "${YELLOW}⚠ Gemini no respondió. Plan guardado en cola de emergencia.${NC}"
        echo "  Archivo: $PENDING_DIR/${SESSION}-${TIMESTAMP}.plan"
        echo "  Opciones: sm-tmux send --force $SESSION \"plan\" para enviar sin Gemini"
        log_entry "$SESSION" "send" "TIMEOUT" "no" "$ORIGINAL_PLAN"
        exit 1
      fi

      if echo "$VERDICT" | grep -qi "RECHAZADO"; then
        echo -e "${RED}[Gemini] $VERDICT${NC}"
        echo ""
        echo -e "${RED}BLOQUEADO: Gemini rechazó el plan. Corrígelo y vuelve a hacer sm-tmux send.${NC}"
        log_entry "$SESSION" "send" "RECHAZADO" "no" "$ORIGINAL_PLAN"
        # --- Auto-notify rechazo al KB ---
        REJECT_TS=$(date '+%Y%m%d%H%M%S')
        curl -s --max-time 5 -X POST "http://localhost:18791/api/save" \
          -H "Content-Type: application/json" \
          -d "$(jq -n \
            --arg key "sm-tmux-rejected-${REJECT_TS}" \
            --arg value "SESSION=$SESSION | GEMINI=$VERDICT | PLAN_PREVIEW=$(echo "$ORIGINAL_PLAN" | head -1 | cut -c1-100)" \
            --arg category "notification" \
            --arg project "seguridad" \
            '{"key":$key,"value":$value,"category":$category,"project":$project}')" \
          >/dev/null 2>&1 &
        exit 1
      fi

      # Aprobado: guardar en cache
      echo "$(date +%s)" > "$CACHE_FILE"

      echo -e "${GREEN}[Gemini] $VERDICT${NC}"
      /usr/bin/tmux send-keys -t "$SESSION" -l "$ORIGINAL_PLAN"
      /usr/bin/tmux send-keys -t "$SESSION" "" Enter
      echo "$ORIGINAL_PLAN" > "$PENDING_DIR/${SESSION}-last.plan"
      echo ""
      echo -e "${GREEN}APROBADO Y ENVIADO a '$SESSION'${NC}"
      log_entry "$SESSION" "send" "APROBADO" "yes" "$ORIGINAL_PLAN"
    fi
    ;;

  template)
    TIPO="$2"
    case "$TIPO" in
      code)
        cat <<'EOF'
TAREA: [Descripción de la feature/fix — mín 10 chars]
MODELO: claude-sonnet-4-6
BORIS: git pull origin main + git tag pre-[nombre] -m "Antes de [nombre]"
VERIFICACION: [comando concreto: curl, test, build, grep, bash -n]
EVIDENCIA: [output esperado — mín 10 chars]
KB: kb_save key=resultado-[proyecto]-[nombre] category=response project=[proyecto] value="STATUS: done"
EOF
        ;;
      docker)
        cat <<'EOF'
TAREA: [Descripción del deploy/container — mín 10 chars]
MODELO: claude-sonnet-4-6
BORIS: docker commit [container] [container]-backup-$(date +%d%m%y) como punto de retorno
VERIFICACION: docker ps | grep [container] && curl -s http://127.0.0.1:[puerto]/health
EVIDENCIA: [container running + health endpoint OK — mín 10 chars]
KB: kb_save key=resultado-[proyecto]-[nombre] category=response project=[proyecto] value="STATUS: done"
EOF
        ;;
      infra)
        cat <<'EOF'
TAREA: [Descripción del cambio infra — mín 10 chars]
MODELO: claude-sonnet-4-6
BORIS: cp [archivo-config] [archivo-config].bak-$(date +%d%m%y) como backup
VERIFICACION: [systemctl status, nginx -t, diff, etc.]
EVIDENCIA: [servicio activo, config válida — mín 10 chars]
KB: kb_save key=resultado-[proyecto]-[nombre] category=response project=[proyecto] value="STATUS: done"
EOF
        ;;
      report)
        cat <<'EOF'
TAREA: [Descripción del reporte/análisis — mín 10 chars]
MODELO: claude-sonnet-4-6
BORIS: solo lectura — no modifica archivos ni servicios
VERIFICACION: [comando de lectura: cat, grep, docker ps, etc.]
EVIDENCIA: [datos obtenidos — mín 10 chars]
KB: kb_save key=resultado-[proyecto]-[nombre] category=response project=[proyecto] value="STATUS: done"
EOF
        ;;
      *)
        echo "Tipos disponibles: code, docker, infra, report"
        exit 1
        ;;
    esac
    ;;

  stats)
    if [ ! -f "$LOG_FILE" ] || [ ! -s "$LOG_FILE" ]; then
      echo "No hay estadísticas — no se han registrado envíos."
      exit 0
    fi

    # Filtrar últimas 24h por fecha (comparar solo fecha YYYY-MM-DD)
    YESTERDAY=$(date -d '24 hours ago' '+%Y-%m-%d' 2>/dev/null || date -v-24H '+%Y-%m-%d' 2>/dev/null)
    TODAY=$(date '+%Y-%m-%d')

    # Extraer líneas de las últimas 24h (incluir hoy y ayer si aplica)
    LINES_24H=$(grep -E "^\[($TODAY|$YESTERDAY)" "$LOG_FILE" 2>/dev/null)

    if [ -z "$LINES_24H" ]; then
      echo "No hay envíos en las últimas 24h."
      exit 0
    fi

    TOTAL=$(echo "$LINES_24H" | wc -l | tr -d ' ')
    APROBADOS=$(echo "$LINES_24H" | grep -c 'GEMINI=APROBADO' 2>/dev/null || true); APROBADOS=${APROBADOS:-0}
    RECHAZADOS=$(echo "$LINES_24H" | grep -c 'GEMINI=RECHAZADO' 2>/dev/null || true); RECHAZADOS=${RECHAZADOS:-0}
    FORCE=$(echo "$LINES_24H" | grep -c 'GEMINI=SKIP' 2>/dev/null || true); FORCE=${FORCE:-0}
    CACHED=$(echo "$LINES_24H" | grep -c 'GEMINI=CACHED' 2>/dev/null || true); CACHED=${CACHED:-0}
    TIMEOUT=$(echo "$LINES_24H" | grep -c 'GEMINI=TIMEOUT' 2>/dev/null || true); TIMEOUT=${TIMEOUT:-0}

    # Calcular porcentajes
    pct() {
      local n="$1" t="$2"
      if [ "$t" -eq 0 ]; then echo "0"; return; fi
      echo $(( (n * 100) / t ))
    }

    PCT_APROBADOS=$(pct "$APROBADOS" "$TOTAL")
    PCT_RECHAZADOS=$(pct "$RECHAZADOS" "$TOTAL")
    PCT_FORCE=$(pct "$FORCE" "$TOTAL")
    PCT_CACHED=$(pct "$CACHED" "$TOTAL")
    PCT_TIMEOUT=$(pct "$TIMEOUT" "$TOTAL")

    echo "sm-tmux stats — últimas 24h"
    echo "════════════════════════════"
    printf "Total envíos:    %4d\n" "$TOTAL"
    printf "  Aprobados:     %4d  (%d%%)\n" "$APROBADOS" "$PCT_APROBADOS"
    printf "  Rechazados:    %4d  (%d%%)\n" "$RECHAZADOS" "$PCT_RECHAZADOS"
    printf "  Force (skip):  %4d  (%d%%)\n" "$FORCE" "$PCT_FORCE"
    printf "  Cache:         %4d  (%d%%)\n" "$CACHED" "$PCT_CACHED"
    printf "  Timeout:       %4d  (%d%%)\n" "$TIMEOUT" "$PCT_TIMEOUT"
    echo ""

    # Sesiones activas con count
    echo "Sesiones activas:"
    echo "$LINES_24H" | grep -oP 'SESSION=\K[^ ]+' | sort | uniq -c | sort -rn | while read -r count sess; do
      printf "  %-24s %d envíos\n" "$sess" "$count"
    done
    echo ""

    # Último envío
    LAST_LINE=$(echo "$LINES_24H" | tail -1)
    LAST_TS=$(echo "$LAST_LINE" | grep -oP '^\[\K[^\]]+')
    LAST_SESS=$(echo "$LAST_LINE" | grep -oP 'SESSION=\K[^ ]+')
    LAST_GEM=$(echo "$LAST_LINE" | grep -oP 'GEMINI=\K[^ ]+')
    echo "Último envío: $LAST_TS → $LAST_SESS ($LAST_GEM)"
    echo ""

    # sypnose-hub metrics
    echo -e "${YELLOW}▸ SYPNOSE HUB${NC}"
    HUB_HEALTH=$(curl -s --max-time 3 http://localhost:8095/health 2>/dev/null)
    if [ -n "$HUB_HEALTH" ]; then
        HUB_CLIENTS=$(echo "$HUB_HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('clients',0))" 2>/dev/null)
        HUB_UPTIME=$(echo "$HUB_HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); u=d.get('uptime',0); h=int(u//3600); m=int((u%3600)//60); print(f'{h}h {m}m')" 2>/dev/null)
        HUB_EVENTS=$(echo "$HUB_HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('bufferedEvents',0))" 2>/dev/null)
        HUB_LAST=$(echo "$HUB_HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('lastCheck','?')[:19])" 2>/dev/null)
        echo "  Clientes SSE: $HUB_CLIENTS"
        echo "  Eventos buffer: $HUB_EVENTS"
        echo "  Uptime: $HUB_UPTIME"
        echo "  Último poll: $HUB_LAST"
    else
        echo "  Hub no responde en :8095"
    fi
    ;;

  inbox)
    shift
    INBOX_ALL=0
    INBOX_PROJECT=""
    while true; do
        case "$1" in
            --all) INBOX_ALL=1; shift ;;
            --project) INBOX_PROJECT="$2"; shift 2 ;;
            *) break ;;
        esac
    done

    ACKED_FILE="$HOME/.openclaw/inbox-acked.list"
    touch "$ACKED_FILE"

    # Buscar notificaciones para SM — dos búsquedas para capturar todo lo dirigido al SM
    INBOX_URL1="http://localhost:18791/api/search?q=notify+sm&limit=100"
    INBOX_URL2="http://localhost:18791/api/search?q=%22sm-claude-web%22&limit=100"
    [ -n "$INBOX_PROJECT" ] && INBOX_URL1="${INBOX_URL1}&project=${INBOX_PROJECT}"
    [ -n "$INBOX_PROJECT" ] && INBOX_URL2="${INBOX_URL2}&project=${INBOX_PROJECT}"

    # Cache: no repetir queries si último fue hace <30s
    INBOX_CACHE_R1="/tmp/sm-tmux-inbox-cache-r1.json"
    INBOX_CACHE_R2="/tmp/sm-tmux-inbox-cache-r2.json"
    INBOX_CACHE_MAX_AGE=30
    USE_INBOX_CACHE=0

    if [ -f "$INBOX_CACHE_R1" ] && [ -f "$INBOX_CACHE_R2" ]; then
        CACHE_AGE=$(( $(date +%s) - $(stat -c %Y "$INBOX_CACHE_R1") ))
        if [ "$CACHE_AGE" -lt "$INBOX_CACHE_MAX_AGE" ]; then
            USE_INBOX_CACHE=1
        fi
    fi

    if [ "$USE_INBOX_CACHE" = "1" ]; then
        RESP1=$(cat "$INBOX_CACHE_R1" 2>/dev/null)
        RESP2=$(cat "$INBOX_CACHE_R2" 2>/dev/null)
    else
        RESP1=$(curl -s --max-time 10 "$INBOX_URL1" 2>/dev/null)
        RESP2=$(curl -s --max-time 10 "$INBOX_URL2" 2>/dev/null)
        # Guardar cache si las respuestas no están vacías
        [ -n "$RESP1" ] && echo "$RESP1" > "$INBOX_CACHE_R1" 2>/dev/null
        [ -n "$RESP2" ] && echo "$RESP2" > "$INBOX_CACHE_R2" 2>/dev/null
    fi

    if [ -z "$RESP1" ] && [ -z "$RESP2" ]; then
        echo "Error: No se pudo conectar al KB"
        exit 1
    fi

    # Parsear y filtrar — combinar ambas respuestas, deduplicar por id
    echo "" | python3 -c "
import json, sys

show_all = sys.argv[1] == '1'
acked_file = sys.argv[2]
resp1_str = sys.argv[3] if len(sys.argv) > 3 else '{}'
resp2_str = sys.argv[4] if len(sys.argv) > 4 else '{}'

try:
    with open(acked_file) as f:
        acked = set(l.strip() for l in f if l.strip())
except:
    acked = set()

# Combinar resultados de ambas búsquedas, deduplicar por id
seen_ids = set()
all_results = []
for resp_str in [resp1_str, resp2_str]:
    if not resp_str:
        continue
    try:
        data = json.loads(resp_str)
        for r in data.get('results', []):
            rid = r.get('id')
            if rid not in seen_ids:
                seen_ids.add(rid)
                key = r.get('key', '')
                val = r.get('value', '')
                # Filtrar: notify-sm, reply-sm, o TO: sm en value
                if key.startswith('notify-sm') or key.startswith('reply-sm') or 'TO: sm' in val or 'TO:sm' in val:
                    all_results.append(r)
    except:
        pass

pending = []
read = []
for r in all_results:
    key = r.get('key', '')
    val = r.get('value', '')[:200].replace('\n', ' ')
    proj = r.get('project', '?')
    ts = r.get('last_accessed_at', '?')[:16]
    if key in acked:
        read.append((key, proj, ts, val))
    else:
        pending.append((key, proj, ts, val))

# Header
total = len(pending) + len(read)
print(f'Inbox SM — {len(pending)} pendientes, {len(read)} leídas ({total} total)')
print('════════════════════════════════════════════════════')
print()

if not pending and not show_all:
    print('No hay notificaciones pendientes.')
    print('Usa --all para ver también las leídas.')
    sys.exit(0)

# Pendientes
if pending:
    print('\033[1;33mPENDIENTES:\033[0m')
    for key, proj, ts, val in pending:
        # Color por contenido
        if 'DONE' in val.upper():
            c = '\033[0;32m'
        elif 'ERROR' in val.upper():
            c = '\033[0;31m'
        else:
            c = '\033[0;36m'
        nc = '\033[0m'
        print(f'  {c}* {key}{nc}')
        print(f'    [{ts}] proyecto: {proj}')
        print(f'    {c}{val}{nc}')
        print()

# Leídas (solo con --all)
if show_all and read:
    print('\033[0;90mLEIDAS:\033[0m')
    for key, proj, ts, val in read:
        print(f'  \033[0;90m+ {key}\033[0m')
        print(f'    \033[0;90m[{ts}] proyecto: {proj}\033[0m')
        print(f'    \033[0;90m{val[:120]}\033[0m')
        print()
" "$INBOX_ALL" "$ACKED_FILE" "$RESP1" "$RESP2"
    ;;

  ack)
    if [ -z "$2" ]; then
        echo "Uso: sm-tmux ack <key>       — marcar una notificación como leída"
        echo "      sm-tmux ack --all       — marcar TODAS las pendientes como leídas"
        exit 1
    fi

    ACKED_FILE="$HOME/.openclaw/inbox-acked.list"
    touch "$ACKED_FILE"

    if [ "$2" = "--all" ]; then
        # ACK todas las pendientes — dos búsquedas para capturar todo lo dirigido al SM
        ACK_URL1="http://localhost:18791/api/search?q=notify+sm&limit=100"
        ACK_URL2="http://localhost:18791/api/search?q=%22sm-claude-web%22&limit=100"
        ACK_RESP1=$(curl -s --max-time 10 "$ACK_URL1" 2>/dev/null)
        ACK_RESP2=$(curl -s --max-time 10 "$ACK_URL2" 2>/dev/null)
        NEW_COUNT=$(echo "" | python3 -c "
import json, sys
acked_file = sys.argv[1]
resp1_str = sys.argv[2] if len(sys.argv) > 2 else '{}'
resp2_str = sys.argv[3] if len(sys.argv) > 3 else '{}'
try:
    with open(acked_file) as f: acked = set(l.strip() for l in f if l.strip())
except: acked = set()
seen_ids = set()
count = 0
for resp_str in [resp1_str, resp2_str]:
    if not resp_str:
        continue
    try:
        data = json.loads(resp_str)
        for r in data.get('results', []):
            rid = r.get('id')
            if rid in seen_ids:
                continue
            seen_ids.add(rid)
            key = r.get('key', '')
            val = r.get('value', '')
            if key.startswith('notify-sm') or key.startswith('reply-sm') or 'TO: sm' in val or 'TO:sm' in val:
                if key and key not in acked:
                    print(key)
                    count += 1
    except: pass
print(f'COUNT:{count}', file=sys.stderr)
" "$ACKED_FILE" "$ACK_RESP1" "$ACK_RESP2" >> "$ACKED_FILE" 2>/tmp/ack-count.tmp)
        ACK_COUNT=$(grep 'COUNT:' /tmp/ack-count.tmp 2>/dev/null | sed 's/COUNT://')
        rm -f /tmp/ack-count.tmp
        echo -e "${GREEN}✓ ${ACK_COUNT:-0} notificaciones marcadas como leídas${NC}"
    else
        KEY="$2"
        if grep -qxF "$KEY" "$ACKED_FILE" 2>/dev/null; then
            echo "Ya estaba marcada como leída: $KEY"
        else
            echo "$KEY" >> "$ACKED_FILE"
            echo -e "${GREEN}✓ ACK: $KEY${NC}"
        fi
    fi
    ;;

  reply)
    if [ -z "$2" ] || [ -z "$3" ]; then
        echo "Uso: sm-tmux reply <key-original> <mensaje>"
        echo "Responde a una notificación guardando en KB"
        exit 1
    fi
    REPLY_KEY="$2"
    REPLY_MSG="$3"
    REPLY_TS=$(date '+%Y-%m-%dT%H:%M:%SZ')

    # Leer la notificación original para extraer proyecto
    ORIG=$(curl -s --max-time 5 "http://localhost:18791/api/read?key=${REPLY_KEY}" 2>/dev/null)
    ORIG_PROJECT=$(echo "$ORIG" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('entry',{}).get('project','sistema'))" 2>/dev/null)
    ORIG_PROJECT="${ORIG_PROJECT:-sistema}"

    # Guardar respuesta en KB
    RESPONSE_KEY="reply-sm-$(date '+%Y%m%d%H%M%S')"
    curl -s --max-time 10 -X POST "http://localhost:18791/api/save" \
        -H "Content-Type: application/json" \
        -d "$(jq -n \
            --arg key "$RESPONSE_KEY" \
            --arg value "RE: $REPLY_KEY | FROM: sm-claude-web | TIMESTAMP: $REPLY_TS | MENSAJE: $REPLY_MSG" \
            --arg category "notification" \
            --arg project "$ORIG_PROJECT" \
            '{"key":$key,"value":$value,"category":$category,"project":$project}')" \
        >/dev/null 2>&1

    if [ $? -eq 0 ]; then
        # Auto-ACK la notificación original
        ACKED_FILE="$HOME/.openclaw/inbox-acked.list"
        touch "$ACKED_FILE"
        grep -qxF "$REPLY_KEY" "$ACKED_FILE" 2>/dev/null || echo "$REPLY_KEY" >> "$ACKED_FILE"

        echo -e "${GREEN}✓ Respuesta enviada${NC}"
        echo "  Key: $RESPONSE_KEY"
        echo "  RE: $REPLY_KEY"
        echo "  Proyecto: $ORIG_PROJECT"
        echo "  Mensaje: $REPLY_MSG"
        echo -e "  ${CYAN}(Notificación original marcada como leída)${NC}"
    else
        echo -e "${RED}Error enviando respuesta al KB${NC}"
        exit 1
    fi
    ;;

  assign)
    if [ -z "$2" ] || [ -z "$3" ]; then
        echo "Uso: sm-tmux assign <sesion> <task-key> [--project <p>]"
        exit 1
    fi
    SESSION="$2"
    TASK_KEY="$3"
    ASSIGN_PROJECT=""
    if [ "$4" = "--project" ] && [ -n "$5" ]; then
        ASSIGN_PROJECT="$5"
    fi

    /usr/bin/tmux has-session -t "$SESSION" 2>/dev/null || { echo "ERROR: sesión '$SESSION' no existe"; exit 1; }

    echo "[sm-tmux assign] Leyendo task key=$TASK_KEY..."
    ASSIGN_URL="http://localhost:18791/api/read?key=${TASK_KEY}"
    [ -n "$ASSIGN_PROJECT" ] && ASSIGN_URL="${ASSIGN_URL}&project=${ASSIGN_PROJECT}"

    TASK_CONTENT=$(curl -s --max-time 10 "$ASSIGN_URL" 2>/dev/null | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    entry=d.get('entry',{})
    if entry:
        print(entry.get('value',''))
    else:
        print('')
except:
    print('')
" 2>/dev/null)

    if [ -z "$TASK_CONTENT" ]; then
        echo -e "${RED}ERROR: No se encontró task key=$TASK_KEY${NC}"
        exit 1
    fi

    echo -e "${CYAN}Task encontrada:${NC}"
    echo "$TASK_CONTENT" | head -5
    echo "..."
    echo ""

    # Enviar via send (pasa por Gemini automáticamente)
    exec "$0" send "$SESSION" "kb_read key=$TASK_KEY project=${ASSIGN_PROJECT:-seguridad}"
    ;;

  dashboard)
    echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          sm-tmux DASHBOARD — SM OpenClaw           ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Sesiones tmux con estado
    echo -e "${YELLOW}▸ SESIONES TMUX${NC}"
    /usr/bin/tmux list-sessions -F '#{session_name}' 2>/dev/null | while IFS= read -r SNAME; do
        STATE=$(get_terminal_state "$SNAME")
        case "$STATE" in
            WORKING) STATE_ICON="${GREEN}⚡ WORKING${NC}" ;;
            ERROR)   STATE_ICON="${RED}✗ ERROR${NC}" ;;
            IDLE)    STATE_ICON="${CYAN}○ IDLE${NC}" ;;
            OFFLINE) STATE_ICON="${RED}✗ OFFLINE${NC}" ;;
            *)       STATE_ICON="? $STATE" ;;
        esac
        echo -e "  ${STATE_ICON}  $SNAME"
    done
    echo ""

    # Inbox pendientes
    echo -e "${YELLOW}▸ INBOX${NC}"
    ACKED_FILE="$HOME/.openclaw/inbox-acked.list"
    touch "$ACKED_FILE"
    DASH_RESP1=$(curl -s --max-time 5 "http://localhost:18791/api/search?q=notify+sm&limit=100" 2>/dev/null)
    DASH_RESP2=$(curl -s --max-time 5 "http://localhost:18791/api/search?q=%22sm-claude-web%22&limit=100" 2>/dev/null)
    if [ -n "$DASH_RESP1" ] || [ -n "$DASH_RESP2" ]; then
        INBOX_STATS=$(echo "" | python3 -c "
import json,sys
acked_file=sys.argv[1]
resp1_str=sys.argv[2] if len(sys.argv) > 2 else '{}'
resp2_str=sys.argv[3] if len(sys.argv) > 3 else '{}'
try:
    with open(acked_file) as f: acked=set(l.strip() for l in f if l.strip())
except: acked=set()
seen_ids=set()
pending=0
for resp_str in [resp1_str, resp2_str]:
    if not resp_str:
        continue
    try:
        data=json.loads(resp_str)
        for r in data.get('results',[]):
            rid=r.get('id')
            if rid in seen_ids:
                continue
            seen_ids.add(rid)
            k=r.get('key','')
            val=r.get('value','')
            if k.startswith('notify-sm') or k.startswith('reply-sm') or 'TO: sm' in val or 'TO:sm' in val:
                if k not in acked:
                    pending+=1
    except: pass
print(f'{pending} pendientes')
" "$ACKED_FILE" "$DASH_RESP1" "$DASH_RESP2" 2>/dev/null)
        echo "  Inbox: $INBOX_STATS"
    else
        echo "  KB no responde"
    fi
    echo ""

    # Tasks pending en KB
    echo -e "${YELLOW}▸ TASKS PENDING${NC}"
    TASKS_RESP=$(curl -s --max-time 5 "http://localhost:18791/api/search?q=pending&limit=50" 2>/dev/null)
    if [ -n "$TASKS_RESP" ]; then
        echo "$TASKS_RESP" | python3 -c "
import json,sys
try:
    data=json.load(sys.stdin)
    tasks=[r for r in data.get('results',[]) if r.get('category')=='task' and 'pending' in r.get('value','').lower()]
    if not tasks:
        print('  Ninguna')
    else:
        for t in tasks[:5]:
            proj=t.get('project','?')
            key=t.get('key','')
            print(f'  [{proj}] {key}')
        if len(tasks)>5:
            print(f'  ... +{len(tasks)-5} mas')
except:
    print('  Error leyendo tasks')
" 2>/dev/null
    else
        echo "  KB no responde"
    fi
    echo ""

    # Stats rápido (últimas 24h del log)
    echo -e "${YELLOW}▸ STATS 24H${NC}"
    if [ -f "$LOG_FILE" ]; then
        TODAY=$(date '+%Y-%m-%d')
        TOTAL=$(grep -c "$TODAY" "$LOG_FILE" 2>/dev/null || echo 0)
        APPROVED=$(grep "$TODAY" "$LOG_FILE" 2>/dev/null | grep -c "GEMINI=APROBADO" || echo 0)
        REJECTED=$(grep "$TODAY" "$LOG_FILE" 2>/dev/null | grep -c "GEMINI=RECHAZADO" || echo 0)
        echo "  Envios hoy: $TOTAL (${APPROVED} aprobados, ${REJECTED} rechazados)"
    else
        echo "  Sin datos"
    fi
    echo ""

    # Último envío
    echo -e "${YELLOW}▸ ULTIMO ENVIO${NC}"
    if [ -f "$LOG_FILE" ]; then
        LAST=$(tail -1 "$LOG_FILE")
        if [ -n "$LAST" ]; then
            LTS=$(echo "$LAST" | grep -oP '^\[\K[^\]]+')
            LSES=$(echo "$LAST" | grep -oP 'SESSION=\K[^ ]+')
            LGEM=$(echo "$LAST" | grep -oP 'GEMINI=\K[^ ]+')
            echo "  $LTS — $LSES ($LGEM)"
        fi
    else
        echo "  Sin datos"
    fi
    echo ""

    # sypnose-hub metrics
    echo -e "${YELLOW}▸ SYPNOSE HUB${NC}"
    DASH_HUB_HEALTH=$(curl -s --max-time 3 http://localhost:8095/health 2>/dev/null)
    if [ -n "$DASH_HUB_HEALTH" ]; then
        DASH_HUB_CLIENTS=$(echo "$DASH_HUB_HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('clients',0))" 2>/dev/null)
        DASH_HUB_UPTIME=$(echo "$DASH_HUB_HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); u=d.get('uptime',0); h=int(u//3600); m=int((u%3600)//60); print(f'{h}h {m}m')" 2>/dev/null)
        DASH_HUB_EVENTS=$(echo "$DASH_HUB_HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('bufferedEvents',0))" 2>/dev/null)
        DASH_HUB_LAST=$(echo "$DASH_HUB_HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('lastCheck','?')[:19])" 2>/dev/null)
        echo "  Clientes SSE: $DASH_HUB_CLIENTS"
        echo "  Eventos buffer: $DASH_HUB_EVENTS"
        echo "  Uptime: $DASH_HUB_UPTIME"
        echo "  Último poll: $DASH_HUB_LAST"
    else
        echo "  Hub no responde en :8095"
    fi
    echo ""
    echo -e "${CYAN}────────────────────────────────────────${NC}"
    echo "  inbox | ack --all | watch | stats"
    ;;

  followup)
    if [ -z "$2" ]; then
        echo "Uso: sm-tmux followup <sesion>"
        exit 1
    fi
    SESSION="$2"
    LINES="${3:-50}"

    /usr/bin/tmux has-session -t "$SESSION" 2>/dev/null || { echo "ERROR: sesión '$SESSION' no existe"; exit 1; }

    echo "[sm-tmux followup] Capturando $LINES lineas de '$SESSION'..."
    CAPTURE=$(/usr/bin/tmux capture-pane -t "$SESSION" -p | tail -"$LINES")

    if [ -z "$CAPTURE" ]; then
        echo "Sesion vacia o sin output."
        exit 0
    fi

    echo "[sm-tmux followup] Analizando con Gemini..."

    API_URL="http://localhost:8317/v1/chat/completions"
    # API_KEY loaded from env (ver inicio del script)
    FOLLOWUP_PROMPT="Eres un asistente que resume el estado de trabajo de un agente. Analiza el output de terminal y responde en español con EXACTAMENTE este formato:

ESTADO: [trabajando|esperando|idle|error]
TAREA: [que esta haciendo en 1 linea]
PROGRESO: [que ha completado]
PENDIENTE: [que falta]
RIESGO: [algun error o warning visible, o 'ninguno']

Maximo 5 lineas. Sin explicaciones extra.

OUTPUT DEL TERMINAL:
$CAPTURE"

    RESPONSE=$(curl -s --max-time 30 \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg model "gemini-2.5-flash" --arg content "$FOLLOWUP_PROMPT" \
            '{"model":$model,"messages":[{"role":"user","content":$content}],"max_tokens":300}')" \
        "$API_URL" 2>/dev/null)

    SUMMARY=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty' 2>/dev/null)

    if [ -z "$SUMMARY" ]; then
        echo -e "${YELLOW}Gemini no respondio. Mostrando ultimas 10 lineas:${NC}"
        echo "$CAPTURE" | tail -10
    else
        echo ""
        echo -e "${CYAN}=== Resumen: $SESSION ===${NC}"
        echo "$SUMMARY"
        echo -e "${CYAN}=========================${NC}"
    fi
    ;;

  queue)
    QUEUE_PROJECT="$2"
    echo -e "${CYAN}Tasks pending en Knowledge Hub${NC}"
    echo "════════════════════════════════════════"
    echo ""

    QUEUE_URL="http://localhost:18791/api/search?q=pending&limit=100"
    [ -n "$QUEUE_PROJECT" ] && QUEUE_URL="${QUEUE_URL}&project=${QUEUE_PROJECT}"

    RESPONSE=$(curl -s --max-time 10 "$QUEUE_URL" 2>/dev/null)
    if [ -z "$RESPONSE" ]; then
        echo "Error: No se pudo conectar al KB"
        exit 1
    fi

    echo "$RESPONSE" | python3 -c "
import json,sys
data=json.load(sys.stdin)
tasks=[]
for r in data.get('results',[]):
    if r.get('category')!='task': continue
    val=r.get('value','')
    if 'STATUS: pending' not in val and 'status: pending' not in val.lower(): continue
    key=r.get('key','')
    proj=r.get('project','?')
    # Extraer TO y TAREA del value
    to_field='?'
    tarea_field=''
    for line in val.split('\n'):
        l=line.strip()
        if l.startswith('TO:'): to_field=l[3:].strip()
        if l.startswith('TAREA:'): tarea_field=l[6:].strip()[:80]
    tasks.append((proj, key, to_field, tarea_field))

if not tasks:
    print('No hay tasks pending.')
else:
    # Agrupar por proyecto
    by_proj={}
    for proj,key,to,tarea in tasks:
        by_proj.setdefault(proj,[]).append((key,to,tarea))
    for proj in sorted(by_proj.keys()):
        print(f'\033[1;33m{proj}\033[0m ({len(by_proj[proj])} pending)')
        for key,to,tarea in by_proj[proj]:
            print(f'  \033[0;36m{key}\033[0m')
            print(f'    TO: {to} | {tarea[:60]}')
        print()
    print(f'Total: {len(tasks)} tasks pending')
" 2>/dev/null
    ;;

  flow)
    shift
    case "$1" in
      add)
        shift
        FLOW_EVERY=""
        FLOW_SESSION=""
        while true; do
            case "$1" in
                --every) FLOW_EVERY="$2"; shift 2 ;;
                --session) FLOW_SESSION="$2"; shift 2 ;;
                *) break ;;
            esac
        done
        FLOW_CMD="$*"

        if [ -z "$FLOW_EVERY" ] || [ -z "$FLOW_CMD" ]; then
            echo "Uso: sm-tmux flow add --every <5m|30m|1h|6h|24h> [--session <s>] <comando>"
            exit 1
        fi

        # Convertir intervalo a cron expression
        case "$FLOW_EVERY" in
            1m)  CRON_EXPR="* * * * *" ;;
            5m)  CRON_EXPR="*/5 * * * *" ;;
            10m) CRON_EXPR="*/10 * * * *" ;;
            15m) CRON_EXPR="*/15 * * * *" ;;
            30m) CRON_EXPR="*/30 * * * *" ;;
            1h)  CRON_EXPR="0 * * * *" ;;
            2h)  CRON_EXPR="0 */2 * * *" ;;
            6h)  CRON_EXPR="0 */6 * * *" ;;
            12h) CRON_EXPR="0 */12 * * *" ;;
            24h) CRON_EXPR="0 0 * * *" ;;
            *)   echo -e "${RED}Intervalo no válido: $FLOW_EVERY${NC}"; echo "Válidos: 1m 5m 10m 15m 30m 1h 2h 6h 12h 24h"; exit 1 ;;
        esac

        # Generar ID único
        FLOW_ID="flow-$(date +%s)"

        # Si tiene --session, wrappear el comando para que se ejecute en esa sesión tmux
        if [ -n "$FLOW_SESSION" ]; then
            FULL_CMD="/usr/bin/tmux send-keys -t $FLOW_SESSION '$FLOW_CMD' Enter"
        else
            FULL_CMD="$FLOW_CMD"
        fi

        # Agregar a crontab
        (crontab -l 2>/dev/null; echo "$CRON_EXPR $FULL_CMD #sm-tmux-flow-$FLOW_ID every=$FLOW_EVERY") | crontab -

        echo -e "${GREEN}✓ Flow creado${NC}"
        echo "  ID: $FLOW_ID"
        echo "  Cada: $FLOW_EVERY"
        echo "  Comando: $FLOW_CMD"
        [ -n "$FLOW_SESSION" ] && echo "  Sesión: $FLOW_SESSION"
        echo "  Cron: $CRON_EXPR"
        ;;

      list)
        echo -e "${CYAN}Flows activos (sm-tmux)${NC}"
        echo "════════════════════════════════════════"
        FLOWS=$(crontab -l 2>/dev/null | grep '#sm-tmux-flow-')
        if [ -z "$FLOWS" ]; then
            echo "No hay flows activos."
        else
            echo "$FLOWS" | while IFS= read -r line; do
                FID=$(echo "$line" | grep -oP '#sm-tmux-flow-\K[^ ]+')
                FEVERY=$(echo "$line" | grep -oP 'every=\K[^ ]+')
                # Extraer comando (entre cron expr y el comentario)
                FCMD=$(echo "$line" | sed 's/^[^ ]* [^ ]* [^ ]* [^ ]* [^ ]* //' | sed 's/ #sm-tmux-flow-.*//')
                echo -e "  ${GREEN}●${NC} $FID (cada $FEVERY)"
                echo "    $FCMD"
            done
            echo ""
            FCOUNT=$(echo "$FLOWS" | wc -l)
            echo "Total: $FCOUNT flows"
        fi
        ;;

      remove)
        shift
        if [ "$1" = "--all" ]; then
            crontab -l 2>/dev/null | grep -v '#sm-tmux-flow-' | crontab -
            echo -e "${GREEN}✓ Todos los flows eliminados${NC}"
        elif [ -n "$1" ]; then
            REMOVE_ID="$1"
            if crontab -l 2>/dev/null | grep -q "#sm-tmux-flow-$REMOVE_ID"; then
                crontab -l 2>/dev/null | grep -v "#sm-tmux-flow-$REMOVE_ID" | crontab -
                echo -e "${GREEN}✓ Flow $REMOVE_ID eliminado${NC}"
            else
                echo -e "${RED}Flow '$REMOVE_ID' no encontrado${NC}"
                exit 1
            fi
        else
            echo "Uso: sm-tmux flow remove <id|--all>"
            exit 1
        fi
        ;;

      *)
        echo "Uso: sm-tmux flow <add|list|remove>"
        echo ""
        echo "  add --every <intervalo> [--session <s>] <cmd>  — crear tarea recurrente"
        echo "  list                                            — ver flows activos"
        echo "  remove <id|--all>                               — eliminar flow"
        echo ""
        echo "Intervalos: 1m 5m 10m 15m 30m 1h 2h 6h 12h 24h"
        ;;
    esac
    ;;

  watch)
    shift
    WATCH_PROJECT=""
    WATCH_INTERVAL=3
    WATCH_QUIET=0
    while true; do
        case "$1" in
            --project) WATCH_PROJECT="$2"; shift 2 ;;
            --interval) WATCH_INTERVAL="$2"; shift 2 ;;
            --quiet) WATCH_QUIET=1; shift ;;
            *) break ;;
        esac
    done

    echo -e "${CYAN}sm-tmux watch — Live KB notifications (Ctrl+C para salir)${NC}"
    echo "Polling cada ${WATCH_INTERVAL}s | Filtro: ${WATCH_PROJECT:-todos}"
    echo "════════════════════════════════════════════════════"
    echo ""

    SEEN_FILE=$(mktemp)
    COUNT_FILE=$(mktemp)
    echo "0" > "$COUNT_FILE"

    cleanup_watch() {
        echo ""
        echo -e "${CYAN}Watch terminado. $(cat "$COUNT_FILE" 2>/dev/null || echo 0) notificaciones mostradas.${NC}"
        rm -f "$SEEN_FILE" "$COUNT_FILE"
        exit 0
    }
    trap cleanup_watch INT TERM

    WATCH_URL1="http://localhost:18791/api/search?q=notify+sm&limit=100"
    WATCH_URL2="http://localhost:18791/api/search?q=%22sm-claude-web%22&limit=100"
    [ -n "$WATCH_PROJECT" ] && WATCH_URL1="${WATCH_URL1}&project=${WATCH_PROJECT}"
    [ -n "$WATCH_PROJECT" ] && WATCH_URL2="${WATCH_URL2}&project=${WATCH_PROJECT}"

    # Cargar IDs existentes para no mostrarlos al iniciar
    WINIT1=$(curl -s --max-time 5 "$WATCH_URL1" 2>/dev/null)
    WINIT2=$(curl -s --max-time 5 "$WATCH_URL2" 2>/dev/null)
    echo "" | python3 -c "
import json,sys
seen_ids=set()
for resp_str in [sys.argv[1], sys.argv[2]]:
    if not resp_str: continue
    try:
        data=json.loads(resp_str)
        for r in data.get('results',[]):
            key=r.get('key','')
            val=r.get('value','')
            if key.startswith('notify-sm') or key.startswith('reply-sm') or 'TO: sm' in val or 'TO:sm' in val:
                rid=str(r.get('id',''))
                if rid and rid not in seen_ids:
                    seen_ids.add(rid)
                    print(rid)
    except: pass
" "$WINIT1" "$WINIT2" > "$SEEN_FILE" 2>/dev/null

    INIT_COUNT=$(wc -l < "$SEEN_FILE" 2>/dev/null)
    echo "Cargadas ${INIT_COUNT:-0} notificaciones existentes (no se muestran)"
    echo ""

    while true; do
        sleep "$WATCH_INTERVAL"
        WRESP1=$(curl -s --max-time 5 "$WATCH_URL1" 2>/dev/null)
        WRESP2=$(curl -s --max-time 5 "$WATCH_URL2" 2>/dev/null)
        [ -z "$WRESP1" ] && [ -z "$WRESP2" ] && continue

        echo "" | python3 -c "
import json,sys
seen_file=sys.argv[1]
resp1_str=sys.argv[2] if len(sys.argv) > 2 else '{}'
resp2_str=sys.argv[3] if len(sys.argv) > 3 else '{}'
try:
    with open(seen_file) as f: seen=set(l.strip() for l in f if l.strip())
except: seen=set()
seen_this_run=set()
try:
    for resp_str in [resp1_str, resp2_str]:
        if not resp_str: continue
        data=json.loads(resp_str)
        for r in data.get('results',[]):
            key=r.get('key','')
            val=r.get('value','')
            if not (key.startswith('notify-sm') or key.startswith('reply-sm') or 'TO: sm' in val or 'TO:sm' in val):
                continue
            rid=str(r.get('id',''))
            if rid and rid not in seen and rid not in seen_this_run:
                seen_this_run.add(rid)
                val_short=val[:200].replace('\n',' ')
                proj=r.get('project','?')
                cat=r.get('category','?')
                print(f'{rid}\t{key}\t{proj}\t{cat}\t{val_short}')
except: pass
" "$SEEN_FILE" "$WRESP1" "$WRESP2" 2>/dev/null | while IFS=$'\t' read -r NID NKEY NPROJ NCAT NVAL; do
            [ -z "$NID" ] && continue
            echo "$NID" >> "$SEEN_FILE"
            CUR=$(cat "$COUNT_FILE"); echo "$((CUR + 1))" > "$COUNT_FILE"

            if echo "$NVAL" | grep -qi "DONE"; then COL="$GREEN"
            elif echo "$NVAL" | grep -qi "ERROR"; then COL="$RED"
            elif echo "$NVAL" | grep -qi "pending"; then COL="$YELLOW"
            else COL="$CYAN"; fi

            TS=$(date '+%H:%M:%S')
            if [ "$WATCH_QUIET" = "1" ]; then
                echo -e "${COL}[$TS] $NKEY${NC}"
            else
                echo -e "${COL}[$TS] KEY: $NKEY${NC}"
                echo -e "  PROJECT: $NPROJ | CATEGORY: $NCAT"
                echo -e "  ${COL}$NVAL${NC}"
                echo "  ────────────────────────────"
            fi
        done
    done
    ;;

  history)
    SESSION_FILTER="$2"
    N="${3:-10}"
    # Si solo se pasa un argumento numérico, tratar como N sin filtro de sesión
    if [ -n "$SESSION_FILTER" ] && echo "$SESSION_FILTER" | grep -qE '^[0-9]+$'; then
      N="$SESSION_FILTER"
      SESSION_FILTER=""
    fi

    if [ ! -f "$LOG_FILE" ] || [ ! -s "$LOG_FILE" ]; then
      echo "No hay historial de envíos."
      exit 0
    fi

    if [ -n "$SESSION_FILTER" ]; then
      LINES=$(grep "SESSION=$SESSION_FILTER" "$LOG_FILE" | tail -"$N")
    else
      LINES=$(tail -"$N" "$LOG_FILE")
    fi

    if [ -z "$LINES" ]; then
      echo "No hay historial de envíos${SESSION_FILTER:+ para sesión '$SESSION_FILTER'}."
      exit 0
    fi

    printf "%-21s %-20s %-10s %-5s %s\n" "FECHA" "SESSION" "GEMINI" "SENT" "PLAN"
    printf "%-21s %-20s %-10s %-5s %s\n" "---------------------" "--------------------" "----------" "-----" "----"
    echo "$LINES" | while IFS= read -r line; do
      TS=$(echo "$line" | grep -oP '^\[\K[^\]]+')
      SES=$(echo "$line" | grep -oP 'SESSION=\K[^ ]+')
      GEM=$(echo "$line" | grep -oP 'GEMINI=\K[^ ]+')
      SNT=$(echo "$line" | grep -oP 'SENT=\K[^ ]+')
      PLN=$(echo "$line" | grep -oP 'PLAN_PREVIEW=\K.*')
      printf "%-21s %-20s %-10s %-5s %s\n" "$TS" "$SES" "$GEM" "$SNT" "$PLN"
    done
    ;;

  resend)
    SESSION="$2"
    if [ -z "$SESSION" ]; then
      echo "Uso: sm-tmux resend <sesion>"
      exit 1
    fi

    LAST_PLAN_FILE="$PENDING_DIR/${SESSION}-last.plan"
    if [ ! -f "$LAST_PLAN_FILE" ]; then
      echo "No hay plan previo para '$SESSION'. Usa sm-tmux send."
      exit 1
    fi

    LAST_PLAN=$(cat "$LAST_PLAN_FILE")
    echo "[sm-tmux resend] Reenviando último plan de '$SESSION'..."
    exec "$0" send "$SESSION" "$LAST_PLAN"
    ;;

  approve)
    echo "DEPRECADO: 'approve' ya no es necesario."
    echo "Usa: sm-tmux send <sesion> <plan>"
    echo "El comando 'send' ahora valida con Gemini y envía automáticamente."
    ;;

  cancel)
    echo "Ya no hay cola de planes. send ahora envía directamente."
    ;;

  pending)
    echo "Ya no hay cola de planes. send ahora envía directamente."
    ;;

  capture)
    if [ -z "$2" ]; then
      echo "Uso: sm-tmux capture <sesion> [lineas]"
      exit 1
    fi
    LINES="${3:-30}"
    /usr/bin/tmux has-session -t "$2" 2>/dev/null || { echo "ERROR: sesión '$2' no existe"; exit 1; }
    /usr/bin/tmux capture-pane -t "$2" -p | tail -"$LINES"
    ;;

  status)
    STATUS_FILE="$HOME/.openclaw/workspace/architect-status.md"
    if [ -f "$STATUS_FILE" ]; then
      cat "$STATUS_FILE"
    else
      echo "No hay reporte de status disponible."
    fi
    ;;

  verify-kb)
    if [ -z "$2" ] || [ -z "$3" ]; then
      echo "Uso: sm-tmux verify-kb <sesion> <kb-key>"
      echo "Verifica que un kb_save existe antes de marcar tarea completada"
      exit 1
    fi
    SESSION="$2"
    KB_KEY="$3"

    echo "[sm-tmux verify-kb] Verificando kb_save key='$KB_KEY'..."

    ENCODED_KEY=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(chr(34) + sys.argv[1] + chr(34)))" "$KB_KEY")
    RESULT=$(curl -s --max-time 10 "http://127.0.0.1:18791/api/search?q=$ENCODED_KEY" 2>/dev/null)
    COUNT=$(echo "$RESULT" | python3 -c "
import json,sys
key=sys.argv[1]
try:
    d=json.load(sys.stdin)
    print(len([r for r in d.get('results',[]) if r.get('key','') == key]))
except:
    print(0)
" "$KB_KEY" 2>/dev/null)

    if [ "$COUNT" = "" ] || [ "$COUNT" = "0" ]; then
      echo ""
      echo "════════════════════════════════════════"
      echo "BLOQUEADO: kb_save key='$KB_KEY' NO encontrado en Knowledge Hub"
      echo "════════════════════════════════════════"
      echo "La tarea NO puede marcarse como completada."
      echo "El arquitecto debe ejecutar kb_save con key='$KB_KEY' antes de reportar done."
      exit 1
    else
      echo ""
      echo "OK: kb_save key='$KB_KEY' encontrado en Knowledge Hub ($COUNT resultado(s))"
      echo "Tarea puede marcarse como completada."
      exit 0
    fi
    ;;

  a2a)
    if [ -z "$2" ] || [ -z "$3" ]; then
        echo "Uso: sm-tmux a2a <sesion-destino> <mensaje>"
        echo "Envía mensaje A2A a un agente/sesión"
        exit 1
    fi
    A2A_TO="$2"
    A2A_MSG="$3"
    A2A_TS=$(date '+%Y-%m-%dT%H:%M:%SZ')
    
    A2A_RESP=$(curl -s --max-time 10 -X POST "http://localhost:18791/a2a/send" \
        -H "Content-Type: application/json" \
        -d "$(jq -n \
            --arg from "sm-claude-web" \
            --arg to "$A2A_TO" \
            --arg type "notify" \
            --arg payload "$A2A_MSG" \
            '{"from":$from,"to":$to,"type":$type,"payload":$payload}')" 2>/dev/null)
    
    A2A_ID=$(echo "$A2A_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id','?'))" 2>/dev/null)
    
    if [ "$A2A_ID" != "?" ] && [ -n "$A2A_ID" ]; then
        echo -e "${GREEN}✓ Mensaje A2A enviado${NC}"
        echo "  ID:  $A2A_ID"
        echo "  De:  sm-claude-web"
        echo "  A:   $A2A_TO"
        echo "  Msg: $A2A_MSG"
    else
        echo -e "${RED}Error enviando A2A${NC}"
        echo "Respuesta: $A2A_RESP"
        exit 1
    fi
    ;;

  a2a-inbox)
    A2A_MSGS=$(curl -s --max-time 10 "http://localhost:18791/a2a/messages?agent=sm-claude-web&unread=true&limit=20" 2>/dev/null)
    A2A_COUNT=$(echo "$A2A_MSGS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('count',0))" 2>/dev/null)
    
    echo -e "${CYAN}A2A Inbox — sm-claude-web${NC}"
    echo "════════════════════════════════════════"
    
    if [ -z "$A2A_COUNT" ] || [ "$A2A_COUNT" = "0" ]; then
        echo "No hay mensajes A2A sin leer."
    else
        echo "Mensajes sin leer: $A2A_COUNT"
        echo ""
        echo "$A2A_MSGS" | python3 -c "
import json,sys
data=json.load(sys.stdin)
msgs=data.get('messages',[])
for m in msgs:
    mid=m.get('id','?')
    frm=m.get('from_agent','?')
    typ=m.get('type','?')
    payload=m.get('payload','')[:120]
    ts=m.get('created_at','')[:16]
    reply=m.get('reply_to')
    reply_str=f' [reply_to:{reply}]' if reply else ''
    print(f'  [{mid}] {ts} | De: {frm} | Tipo: {typ}{reply_str}')
    print(f'       {payload}')
    print()
" 2>/dev/null || echo "$A2A_MSGS"
        echo ""
        echo -e "  ${YELLOW}Usa: sm-tmux a2a-reply <id> <respuesta>${NC}"
    fi
    ;;

  a2a-reply)
    if [ -z "$2" ] || [ -z "$3" ]; then
        echo "Uso: sm-tmux a2a-reply <id-mensaje-original> <respuesta>"
        echo "Responde a un mensaje A2A"
        exit 1
    fi
    REPLY_ID="$2"
    REPLY_MSG="$3"
    
    # Leer mensaje original para saber a quién responder
    ORIG_MSG=$(curl -s --max-time 5 "http://localhost:18791/a2a/messages?agent=sm-claude-web&limit=50" 2>/dev/null)
    ORIG_FROM=$(echo "$ORIG_MSG" | python3 -c "
import json,sys
data=json.load(sys.stdin)
msgs=data.get('messages',[])
for m in msgs:
    if str(m.get('id','')) == sys.argv[1]:
        print(m.get('from_agent','unknown'))
        break
" "$REPLY_ID" 2>/dev/null)
    ORIG_FROM="${ORIG_FROM:-unknown}"
    
    # Enviar respuesta con reply_to
    REPLY_RESP=$(curl -s --max-time 10 -X POST "http://localhost:18791/a2a/send" \
        -H "Content-Type: application/json" \
        -d "$(jq -n \
            --arg from "sm-claude-web" \
            --arg to "$ORIG_FROM" \
            --arg type "response" \
            --arg payload "$REPLY_MSG" \
            --argjson reply_to "$REPLY_ID" \
            '{"from":$from,"to":$to,"type":$type,"payload":$payload,"reply_to":$reply_to}')" 2>/dev/null)
    
    REPLY_NEW_ID=$(echo "$REPLY_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id','?'))" 2>/dev/null)
    
    # Marcar mensaje original como leído
    curl -s --max-time 5 -X POST "http://localhost:18791/a2a/read" \
        -H "Content-Type: application/json" \
        -d "{\"id\": $REPLY_ID}" >/dev/null 2>&1
    
    if [ "$REPLY_NEW_ID" != "?" ] && [ -n "$REPLY_NEW_ID" ]; then
        echo -e "${GREEN}✓ Respuesta A2A enviada${NC}"
        echo "  ID respuesta: $REPLY_NEW_ID"
        echo "  A: $ORIG_FROM"
        echo "  reply_to: $REPLY_ID"
        echo "  Mensaje: $REPLY_MSG"
        echo -e "  ${CYAN}(Mensaje original ID=$REPLY_ID marcado como leído)${NC}"
    else
        echo -e "${RED}Error enviando respuesta A2A${NC}"
        echo "Respuesta: $REPLY_RESP"
        exit 1
    fi
    ;;

  *)
    echo "sm-tmux — comandos disponibles para el SM:"
    echo ""
    echo "  Envío de planes:"
    echo "    send [--force|--dry-run|--broadcast] <s> <p> — validar y enviar plan"
    echo "    template <code|docker|infra|report>          — generar skeleton Boris"
    echo "    resend <sesion>                              — reenviar último plan"
    echo "    assign <sesion> <task-key>                   — asignar task de KB"
    echo ""
    echo "  Mensajería:"
    echo "    inbox [--all] [--project <p>]                — notificaciones pendientes"
    echo "    ack <key|--all>                              — marcar como leída"
    echo "    reply <key> <mensaje>                        — responder a notificación"
    echo "    watch [--project <p>] [--interval <s>]       — live feed notificaciones"
    echo "    a2a <sesion> <msg>                           — enviar mensaje A2A directo"
    echo "    a2a-inbox                                    — ver mensajes A2A sin leer"
    echo "    a2a-reply <id> <msg>                         — responder mensaje A2A"
    echo ""
    echo "  Monitoreo:"
    echo "    dashboard                                    — panel con estado terminales"
    echo "    followup <sesion>                            — resumen IA del progreso"
    echo "    queue [proyecto]                             — tasks pending en KB"
    echo "    flow <add|list|remove>                       — tareas recurrentes"
    echo "    list                                         — sesiones tmux activas"
    echo "    capture <s> [n]                              — ver terminal de la sesión"
    echo "    status                                       — estado de los arquitectos"
    echo "    history [sesion] [N]                         — historial de envíos"
    echo "    stats                                        — métricas últimas 24h"
    echo "    verify-kb <s> <key>                          — verificar que kb_save existe"
    exit 1
    ;;
esac
