#!/bin/bash
# sync-sypnose.sh — Sync skills y commands desde repo sypnose a todos los arquitectos
# Mejoras: sync condicional SHA + alerta SKIP Telegram + log rotación + hash DB no-overwrite
# Crontab: 0 */6 * * * bash /home/gestoria/scripts/sync-sypnose.sh >> ~/logs/sypnose-sync.log 2>&1

REPO_URL="https://github.com/radelqui/sypnose.git"
LOG_FILE="$HOME/logs/sypnose-sync.log"
HASH_DB="$HOME/.sypnose-sync-hashes"
LAST_SHA_FILE="$HOME/.sypnose-last-sha"
TMPDIR="/tmp/sypnose-sync-$$"
# Leer desde env var o archivo de credenciales (NUNCA hardcodear tokens)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(cat ~/.openclaw/credentials/telegram-bot-token 2>/dev/null || echo '')}"
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "[WARN] TELEGRAM_BOT_TOKEN no configurado - saltando alertas Telegram" >> "$LOG_FILE"
fi
TELEGRAM_CHAT_ID="5358902915"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M')] sync-sypnose"

mkdir -p "$HOME/logs"
touch "$HASH_DB" "$LAST_SHA_FILE"

# MEJORA 3: Rotación de log (si > 500 líneas → rotar)
if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt 500 ]; then
    mv "$LOG_FILE" "${LOG_FILE}.bak"
    echo "$LOG_PREFIX Log rotado (> 500 líneas)" > "$LOG_FILE"
fi

echo "$LOG_PREFIX START"

# MEJORA 1: Sync condicional — solo si hay commits nuevos
CURRENT_SHA=$(git ls-remote "$REPO_URL" HEAD 2>/dev/null | cut -f1)
if [ -z "$CURRENT_SHA" ]; then
    echo "$LOG_PREFIX ERROR: No se pudo obtener SHA de $REPO_URL"
    exit 1
fi

LAST_SHA=$(cat "$LAST_SHA_FILE" 2>/dev/null || echo "")
if [ "$CURRENT_SHA" = "$LAST_SHA" ]; then
    echo "$LOG_PREFIX Sin cambios (SHA=$CURRENT_SHA), saliendo"
    exit 0
fi

echo "$LOG_PREFIX Cambios detectados: $LAST_SHA → $CURRENT_SHA"

# Clonar repo
rm -rf "$TMPDIR"
if ! git clone --depth 1 "$REPO_URL" "$TMPDIR" 2>/dev/null; then
    echo "$LOG_PREFIX ERROR: No se pudo clonar sypnose"
    exit 1
fi

# Funciones hash DB
get_saved_hash() {
    grep -F "$1=" "$HASH_DB" 2>/dev/null | tail -1 | cut -d= -f2
}
save_hash() {
    local filepath="$1"
    local hash
    hash=$(sha1sum "$filepath" 2>/dev/null | cut -d' ' -f1)
    grep -vF "$filepath=" "$HASH_DB" > "$HASH_DB.tmp" 2>/dev/null && mv "$HASH_DB.tmp" "$HASH_DB" || true
    echo "$filepath=$hash" >> "$HASH_DB"
}

# MEJORA 2: Acumular SKIPs para alerta Telegram
SKIP_LIST=""

sync_file() {
    local src="$1"
    local dst="$2"
    [ -f "$src" ] || return 0
    mkdir -p "$(dirname "$dst")"
    if [ ! -f "$dst" ]; then
        cp "$src" "$dst"
        save_hash "$dst"
        echo "$LOG_PREFIX  NEW: $(basename $dst)"
        return 0
    fi
    local local_hash
    local_hash=$(sha1sum "$dst" 2>/dev/null | cut -d' ' -f1)
    local saved_hash
    saved_hash=$(get_saved_hash "$dst")
    if [ -z "$saved_hash" ] || [ "$local_hash" = "$saved_hash" ]; then
        cp "$src" "$dst"
        save_hash "$dst"
        echo "$LOG_PREFIX  UPDATED: $(basename $dst)"
    else
        echo "$LOG_PREFIX  SKIP-ALERT (local modified): $(basename $dst) en $(dirname $dst | sed 's|/home/gestoria/||')"
        SKIP_LIST="$SKIP_LIST\n- $(basename $dst) en $(dirname $dst | sed 's|/home/gestoria/||')"
    fi
}

PROJECTS=(
    "/home/gestoria/gestion-contadoresrd"
    "/home/gestoria/IATRADER-RUST"
    "/home/gestoria/eas-builds/FacturaScannerApp"
    "/home/gestoria/seguridad-server"
    "/home/gestoria/oc-manual"
    "/home/gestoria/IATRADER"
)

for proj in "${PROJECTS[@]}"; do
    [ -d "$proj" ] || continue
    echo "$LOG_PREFIX → $proj"
    [ -d "$TMPDIR/.claude/commands" ] && for f in "$TMPDIR/.claude/commands/"*.md; do
        sync_file "$f" "$proj/.claude/commands/$(basename $f)"
    done
    [ -f "$TMPDIR/.claude/skills/boris/SKILL.md" ] && sync_file "$TMPDIR/.claude/skills/boris/SKILL.md" "$proj/.claude/skills/boris/SKILL.md"
    [ -f "$TMPDIR/.claude/skills/bios.md" ] && sync_file "$TMPDIR/.claude/skills/bios.md" "$proj/.claude/skills/bios.md"
    [ -d "$TMPDIR/.claude/hooks" ] && for f in "$TMPDIR/.claude/hooks/"*.sh; do
        sync_file "$f" "$proj/.claude/hooks/$(basename $f)"
        chmod +x "$proj/.claude/hooks/$(basename $f)" 2>/dev/null || true
    done
done

# MEJORA 2: Enviar alerta Telegram si hay SKIPs
if [ -n "$SKIP_LIST" ]; then
    SKIP_COUNT=$(echo -e "$SKIP_LIST" | grep -c "^-" || echo "?")
    MSG="⚠️ sync-sypnose: $SKIP_COUNT archivo(s) con modificaciones locales NO actualizados:%0A$(echo -e "$SKIP_LIST" | sed 's/ /%20/g' | tr '\n' '|' | sed 's/|/%0A/g')"
    curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}&text=${MSG}" > /dev/null 2>&1
    echo "$LOG_PREFIX SKIP-ALERT enviado a Telegram ($SKIP_COUNT archivos)"
fi

# Guardar nuevo SHA
echo "$CURRENT_SHA" > "$LAST_SHA_FILE"

rm -rf "$TMPDIR"
echo "$LOG_PREFIX DONE (SHA=$CURRENT_SHA, hash DB: $(wc -l < $HASH_DB) entries)"
