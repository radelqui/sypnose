#!/bin/bash
# ============================================================
# SYPNOSE v5.2 — INSTALADOR COMPLETO
# Uso: sudo bash install-sypnose-full.sh [usuario]
# Default usuario: gestoria
# ============================================================
set -euo pipefail

# --- Colores ---
RED='\033[0;31m'
YEL='\033[1;33m'
GRN='\033[0;32m'
CYN='\033[0;36m'
RST='\033[0m'

ok()   { echo -e "${GRN}  [OK]${RST}  $1"; }
warn() { echo -e "${YEL}  [WARN]${RST} $1"; }
fail() { echo -e "${RED}  [FAIL]${RST} $1"; exit 1; }
info() { echo -e "${CYN}  ---${RST}  $1"; }

# --- Parametros ---
USER=${1:-gestoria}
HOME_DIR="/home/$USER"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${CYN}=========================================${RST}"
echo -e "${CYN}  SYPNOSE v5.2 — INSTALADOR COMPLETO   ${RST}"
echo -e "${CYN}=========================================${RST}"
echo "  Usuario:    $USER"
echo "  Home:       $HOME_DIR"
echo "  Script dir: $SCRIPT_DIR"
echo ""

# ============================================================
# PASO 0: Verificar que somos root
# ============================================================
info "PASO 0: Verificar permisos root"
if [ "$EUID" -ne 0 ]; then
    fail "Este script debe correr como root. Usa: sudo bash $0 $USER"
fi

if ! id "$USER" &>/dev/null; then
    fail "El usuario '$USER' no existe. Crealo primero con: adduser $USER"
fi
ok "Root confirmado. Usuario '$USER' existe."

# Verificar espacio en disco
AVAIL=$(df -BG /opt 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
if [ "${AVAIL:-0}" -lt 1 ] 2>/dev/null; then
    fail "Menos de 1GB libre en /opt. Liberar espacio antes de instalar."
fi
ok "Espacio en disco: ${AVAIL}GB disponibles en /opt"

# ============================================================
# PASO 1: Prerequisitos del sistema
# ============================================================
info "PASO 1: Instalar prerequisitos del sistema"

apt-get update -qq || warn "apt update fallo — continuando con lo que hay"

PKGS_NEEDED=()
for pkg in tmux git build-essential jq python3 curl; do
    if ! dpkg -s "$pkg" &>/dev/null; then
        PKGS_NEEDED+=("$pkg")
    fi
done

if [ ${#PKGS_NEEDED[@]} -gt 0 ]; then
    info "Instalando: ${PKGS_NEEDED[*]}"
    apt-get install -y "${PKGS_NEEDED[@]}" -qq || fail "No se pudieron instalar paquetes del sistema"
fi
ok "Paquetes del sistema listos"

# Node.js >= 18 via nodesource si no existe o es viejo
NODE_OK=0
if command -v node &>/dev/null; then
    NODE_VER=$(node -e 'console.log(process.version.slice(1).split(".")[0])')
    if [ "$NODE_VER" -ge 18 ] 2>/dev/null; then
        NODE_OK=1
        ok "Node.js $(node --version) detectado"
    fi
fi

if [ "$NODE_OK" -eq 0 ]; then
    info "Instalando Node.js 20.x via nodesource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || fail "nodesource setup fallo"
    apt-get install -y nodejs -qq || fail "nodejs install fallo"
    ok "Node.js $(node --version) instalado"
fi

# Bun para Channel MCP
if ! command -v bun &>/dev/null && ! su -c "~/.bun/bin/bun --version" "$USER" &>/dev/null 2>&1; then
    info "Instalando Bun para usuario $USER..."
    su -c "HOME=$HOME_DIR curl -fsSL https://bun.sh/install | bash" "$USER" || warn "Bun no se pudo instalar — Channel MCP requiere instalacion manual"
else
    ok "Bun disponible"
fi

# ============================================================
# PASO 2: Verificar Knowledge Hub (:18791)
# ============================================================
info "PASO 2: Verificar Knowledge Hub (:18791)"

if curl -sf http://localhost:18791/health &>/dev/null; then
    ok "Knowledge Hub activo en :18791"
else
    warn "Knowledge Hub NO detectado en :18791"
    echo -e "       Instalar manualmente:"
    echo -e "         1. Copiar codigo fuente a /opt/knowledge-hub/"
    echo -e "         2. cd /opt/knowledge-hub && npm install"
    echo -e "         3. sudo cp knowledge-hub.service /etc/systemd/system/"
    echo -e "         4. sudo systemctl enable --now knowledge-hub"
    echo -e "       Sypnose NO puede funcionar sin el Knowledge Hub."
    echo ""
    read -r -p "  Continuar de todas formas? (s/N): " CONT
    [[ "$CONT" =~ ^[sS]$ ]] || fail "Instalacion cancelada. Instala el Knowledge Hub primero."
fi

# ============================================================
# PASO 3: Verificar CLIProxy / SypnoseProxy (:8317)
# ============================================================
info "PASO 3: Verificar CLIProxy (:8317)"

if curl -sf http://localhost:8317/ &>/dev/null; then
    ok "CLIProxy activo en :8317"
else
    warn "CLIProxy NO detectado en :8317"
    echo -e "       Instalar manualmente:"
    echo -e "         1. Copiar binario cli-proxy-api + config.yaml a /home/$USER/cliproxyapi/"
    echo -e "         2. chmod +x /home/$USER/cliproxyapi/cli-proxy-api"
    echo -e "         3. sudo cp cliproxyapi.service /etc/systemd/system/"
    echo -e "         4. sudo systemctl enable --now cliproxyapi"
    echo -e "       Nota: CLIProxy es binario Go externo — no viene en el paquete Sypnose."
    echo ""
fi

# ============================================================
# PASO 4: Instalar Sypnose v5.2 desde paquete
# ============================================================
info "PASO 4: Instalar Sypnose v5.2 en /opt/sypnose/"

# Encontrar el tarball (preferir corrected)
TARBALL=""
if [ -f "$SCRIPT_DIR/sypnose-v52-corrected.tar.gz" ]; then
    TARBALL="$SCRIPT_DIR/sypnose-v52-corrected.tar.gz"
    ok "Usando paquete corregido: sypnose-v52-corrected.tar.gz"
elif [ -f "$SCRIPT_DIR/sypnose-v52.tar.gz" ]; then
    TARBALL="$SCRIPT_DIR/sypnose-v52.tar.gz"
    warn "Usando paquete original (no corregido): sypnose-v52.tar.gz"
else
    fail "No se encontro ningun tarball sypnose-v52*.tar.gz en $SCRIPT_DIR"
fi

# Backup si ya existe instalacion previa
if [ -d /opt/sypnose ]; then
    BACKUP="/opt/sypnose-backup-$(date +%Y%m%d-%H%M%S)"
    warn "Ya existe /opt/sypnose — haciendo backup a $BACKUP"
    cp -a /opt/sypnose "$BACKUP"
    ok "Backup creado en $BACKUP"
fi

# Descomprimir a /tmp y copiar
TMP_DIR=$(mktemp -d)
tar xzf "$TARBALL" -C "$TMP_DIR" || fail "Error al descomprimir $TARBALL"

# Detectar subdirectorio dentro del tar
SRC_DIR=$(find "$TMP_DIR" -maxdepth 1 -mindepth 1 -type d | head -1)
if [ -z "$SRC_DIR" ]; then
    SRC_DIR="$TMP_DIR"
fi

# Verificar que el paquete tiene la estructura correcta
if [ ! -f "$SRC_DIR/core/loop.js" ]; then
    rm -rf "$TMP_DIR"
    fail "Estructura del paquete incorrecta: falta core/loop.js. Paquete corrupto o incompleto."
fi

mkdir -p /opt/sypnose
# Copiar contenido (incluyendo archivos ocultos como .env.example)
cp -r "$SRC_DIR"/. /opt/sypnose/ 2>/dev/null || true
# Copiar dotfiles del nivel raiz del tar si existen
find "$SRC_DIR" -maxdepth 1 -name ".*" -exec cp {} /opt/sypnose/ \; 2>/dev/null || true

chown -R "$USER":"$USER" /opt/sypnose
ok "Archivos copiados a /opt/sypnose/"

# Permisos ejecutables
chmod +x /opt/sypnose/bin/start.js 2>/dev/null || true
find /opt/sypnose/scripts -name "*.js" -exec chmod +x {} \; 2>/dev/null || true
find /opt/sypnose/scripts -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
ok "Permisos de ejecucion aplicados"

# npm install
info "Instalando dependencias npm..."
cd /opt/sypnose
su -c "cd /opt/sypnose && /usr/bin/npm install --silent" "$USER" || fail "npm install fallo en /opt/sypnose"
ok "Dependencias npm instaladas"

# Configurar .env
if [ ! -f /opt/sypnose/.env ]; then
    if [ -f /opt/sypnose/.env.example ]; then
        cp /opt/sypnose/.env.example /opt/sypnose/.env
    else
        touch /opt/sypnose/.env
    fi

    WEBHOOK_TOKEN=$(openssl rand -hex 16)
    TRACE_SALT=$(openssl rand -hex 8)

    cat > /opt/sypnose/.env << EOF
# === GENERADO POR install-sypnose-full.sh $(date -u +%Y-%m-%d) ===
KB_API=http://localhost:18791/api
PROXY_URL=http://localhost:8317/v1/chat/completions
ANTHROPIC_API_KEY=sk-ant-PLACEHOLDER
ANTHROPIC_API_URL=https://api.anthropic.com/v1/messages
WEBHOOK_TOKEN=${WEBHOOK_TOKEN}
TRACE_SALT=${TRACE_SALT}
SSE_PORT=18795
SSE_CORS=*
NODE_ENV=production
BRIEF=0
EOF

    chown "$USER":"$USER" /opt/sypnose/.env
    chmod 600 /opt/sypnose/.env
    ok ".env creado con tokens generados (WEBHOOK_TOKEN, TRACE_SALT)"
    warn "EDITAR /opt/sypnose/.env si necesitas cambiar KB_API o PROXY_URL"
else
    ok ".env ya existe — no sobreescrito"
fi

# Crear clients.json minimo si no existe
if [ ! -f /opt/sypnose/config/clients.json ]; then
    mkdir -p /opt/sypnose/config
    cat > /opt/sypnose/config/clients.json << EOF
{
  "_INSTRUCCIONES": "Anadir un objeto por cada agente tmux. Ejecutar: tmux list-sessions -F '#{session_name}' para descubrir sesiones.",
  "clients": [
    { "id": "ejemplo", "tmux_session": "nombre-tmux", "project_dir": "/home/$USER/mi-proyecto", "client_name": "Mi Proyecto", "industry": "descripcion" }
  ]
}
EOF
    chown "$USER":"$USER" /opt/sypnose/config/clients.json
    warn "config/clients.json creado con ejemplo. EDITAR con tus agentes reales antes de arrancar."
    warn "  Descubrir sesiones: tmux list-sessions -F '#{session_name}'"
    warn "  Verificar paths:   ls -d /home/$USER/mi-proyecto"
else
    ok "config/clients.json ya existe"
fi

# Directorios de log
mkdir -p /var/log/sypnose/audit /var/log/sypnose/events
chown -R "$USER":"$USER" /var/log/sypnose
ok "Directorios /var/log/sypnose/ creados"

# ============================================================
# PASO 5: Verificar SSE Hub (:8095)
# ============================================================
info "PASO 5: Verificar SSE Hub (:8095)"

SSE_HUB_PATH="/home/shared/sypnose-hub"
if [ -f "$SSE_HUB_PATH/index.js" ]; then
    ok "SSE Hub encontrado en $SSE_HUB_PATH"

    # Crear .env si no existe
    SSE_ENV="$HOME_DIR/.config/sypnose-hub.env"
    if [ ! -f "$SSE_ENV" ]; then
        mkdir -p "$HOME_DIR/.config"
        HUB_TOKEN=$(openssl rand -hex 32)
        cat > "$SSE_ENV" << EOF
SYPNOSE_HUB_TOKEN=${HUB_TOKEN}
PORT=8095
EOF
        chown "$USER":"$USER" "$SSE_ENV"
        chmod 600 "$SSE_ENV"
        ok ".env SSE Hub creado en $SSE_ENV"
    else
        ok "SSE Hub .env ya existe"
    fi

    # Copiar systemd si no existe
    if [ ! -f /etc/systemd/system/sypnose-hub.service ]; then
        cat > /etc/systemd/system/sypnose-hub.service << EOF
[Unit]
Description=Sypnose Hub — SSE Bridge sobre Knowledge Hub
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SSE_HUB_PATH
ExecStart=/usr/bin/node $SSE_HUB_PATH/index.js
EnvironmentFile=$SSE_ENV
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
        ok "sypnose-hub.service creado"
    else
        ok "sypnose-hub.service ya existe"
    fi
else
    warn "SSE Hub NO encontrado en $SSE_HUB_PATH"
    echo -e "       El SSE Hub es codigo fuente externo (no viene en el paquete Sypnose)."
    echo -e "       Instalar manualmente: copiar index.js + package.json a $SSE_HUB_PATH"
fi

# ============================================================
# PASO 6: Verificar Channel MCP
# ============================================================
info "PASO 6: Verificar Channel MCP"

CHANNEL_PATH="$SSE_HUB_PATH/channel"
if [ -d "$CHANNEL_PATH" ]; then
    ok "Channel MCP encontrado en $CHANNEL_PATH"

    # bun install si hay package.json
    if [ -f "$CHANNEL_PATH/package.json" ]; then
        BUN_BIN=$(su -c 'echo ~/.bun/bin/bun' "$USER" 2>/dev/null | tr -d '\n')
        if [ -x "$BUN_BIN" ]; then
            su -c "cd $CHANNEL_PATH && $BUN_BIN install --silent" "$USER" 2>/dev/null && ok "Channel MCP: bun install OK" || warn "bun install fallo — verificar manualmente"
        else
            warn "Bun no disponible — omitiendo bun install en Channel MCP"
        fi
    fi
else
    warn "Channel MCP NO encontrado en $CHANNEL_PATH"
    echo -e "       Es codigo fuente externo. Instalar manualmente en $CHANNEL_PATH"
fi

# ============================================================
# PASO 7: Templates Boris
# ============================================================
info "PASO 7: Verificar templates Boris en /opt/sypnose/templates/boris/"

if [ -d /opt/sypnose/templates/boris ]; then
    ok "Templates Boris ya existen en /opt/sypnose/templates/boris/"
else
    mkdir -p /opt/sypnose/templates/boris
    chown -R "$USER":"$USER" /opt/sypnose/templates/boris

    # Crear README de uso
    cat > /opt/sypnose/templates/boris/README.md << 'EOF'
# Boris v6.2 — Templates de instalacion por proyecto

## Uso
Para instalar Boris en un nuevo proyecto:

```bash
PROYECTO=/home/$USER/mi-proyecto
mkdir -p $PROYECTO/.claude/hooks $PROYECTO/.claude/rules $PROYECTO/.brain

# Copiar hooks de un proyecto existente con Boris instalado:
cp /home/<usuario>/<proyecto-ref>/.claude/hooks/*.sh $PROYECTO/.claude/hooks/
chmod +x $PROYECTO/.claude/hooks/*.sh

# Inicializar .brain/
echo "# Task\nNo hay tarea activa." > $PROYECTO/.brain/task.md
echo "# Session State\nNueva sesion." > $PROYECTO/.brain/session-state.md
touch $PROYECTO/.brain/history.md $PROYECTO/.brain/done-registry.md
```

## 6 Hooks que necesita cada proyecto
- boris-session-start.sh  (SessionStart)
- boris-pre-compact.sh    (PreCompact)
- boris-verification-gate.sh (PreToolUse Bash)
- boris-protect-files.sh  (PreToolUse Write|Edit|Read|Bash)
- boris-stop.sh           (Stop)
- kb-inbox-check.sh       (UserPromptSubmit)

## IMPORTANTE
Boris se instala POR PROYECTO, no globalmente.
Este directorio es solo para referencia/copia.
EOF

    warn "Templates Boris: directorio creado pero sin hooks fuente."
    echo -e "       Copia los hooks de un proyecto existente a /opt/sypnose/templates/boris/"
fi

# ============================================================
# PASO 8: Verificar sm-tmux
# ============================================================
info "PASO 8: Verificar sm-tmux"

if [ -x /usr/local/bin/sm-tmux ]; then
    ok "sm-tmux encontrado en /usr/local/bin/sm-tmux"

    # Crear directorios necesarios para el usuario
    su -c "mkdir -p ~/.openclaw/pending-plans ~/.openclaw/plan-cache ~/.config" "$USER" 2>/dev/null
    SM_ENV="$HOME_DIR/.config/sm-tmux.env"
    if [ ! -f "$SM_ENV" ]; then
        cat > "$SM_ENV" << 'EOF'
# Obtener tu key de CLIProxy y ponerla aqui
CLIPROXY_API_KEY="sk-TU-KEY-AQUI"
EOF
        chown "$USER":"$USER" "$SM_ENV"
        chmod 600 "$SM_ENV"
        warn "sm-tmux.env creado en $SM_ENV — EDITAR con tu CLIPROXY_API_KEY"
    else
        ok "sm-tmux.env ya existe"
    fi
else
    warn "sm-tmux NO encontrado en /usr/local/bin/sm-tmux"
    echo -e "       sm-tmux es un script bash externo (1499 lineas)."
    echo -e "       Instalar manualmente:"
    echo -e "         sudo cp sm-tmux /usr/local/bin/sm-tmux"
    echo -e "         sudo chmod +x /usr/local/bin/sm-tmux"
fi

# ============================================================
# PASO 9: Systemd — registrar e instalar services Sypnose
# ============================================================
info "PASO 9: Configurar systemd services"

# Generar services con usuario correcto si no existen ya
for SVC in sypnose-coordinator sypnose-sse; do
    if [ ! -f /etc/systemd/system/${SVC}.service ]; then
        if [ -f /opt/sypnose/systemd/${SVC}.service ]; then
            # Sustituir usuario en el service template
            sed -e "s|User=.*|User=$USER|" -e "s|/home/gestoria|/home/$USER|g" /opt/sypnose/systemd/${SVC}.service \
                > /etc/systemd/system/${SVC}.service
            ok "${SVC}.service instalado desde /opt/sypnose/systemd/"
        else
            warn "${SVC}.service template no encontrado en /opt/sypnose/systemd/"
        fi
    else
        ok "${SVC}.service ya existe en systemd"
    fi
done

systemctl daemon-reload
ok "systemctl daemon-reload OK"

# Enable pero NO start todavia (primero pasar tests)
for SVC in sypnose-coordinator sypnose-sse; do
    if [ -f /etc/systemd/system/${SVC}.service ]; then
        systemctl enable "$SVC" 2>/dev/null && ok "$SVC habilitado (enable)" || warn "$SVC enable fallo"
    fi
done

# Logrotate para logs Sypnose
if [ ! -f /etc/logrotate.d/sypnose ]; then
    cat > /etc/logrotate.d/sypnose << 'LOGEOF'
/var/log/sypnose/events/stream.jsonl {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
/var/log/sypnose/janitor.log /var/log/sypnose/dream.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
LOGEOF
    ok "Logrotate configurado para /var/log/sypnose/"
else
    ok "Logrotate ya configurado"
fi

# ============================================================
# PASO 10: Crontab — janitor y autodream
# ============================================================
info "PASO 10: Configurar crontab para $USER"

CRON_MARK="# === SYPNOSE v5.2 ==="
if su -c "crontab -l 2>/dev/null" "$USER" | grep -q "kb-janitor.js"; then
    ok "Crontab Sypnose ya configurado"
else
    CRON_BLOCK="
$CRON_MARK
0 3 * * * /usr/bin/node /opt/sypnose/scripts/kb-janitor.js >> /var/log/sypnose/janitor.log 2>&1
30 3 * * * /usr/bin/node /opt/sypnose/scripts/autodream-cli.js >> /var/log/sypnose/dream.log 2>&1"

    (su -c "crontab -l 2>/dev/null" "$USER"; echo "$CRON_BLOCK") | su -c "crontab -" "$USER" \
        && ok "Crontab configurado (janitor 3AM, autodream 3:30AM)" \
        || warn "No se pudo configurar crontab — hacerlo manualmente"
fi

# ============================================================
# PASO 11: Tests
# ============================================================
info "PASO 11: Ejecutar tests"

cd /opt/sypnose
TEST_FAIL=0

# npm test (smoke tests — 12/12)
info "npm test (smoke tests)..."
if su -c "cd /opt/sypnose && /usr/bin/npm test 2>&1" "$USER"; then
    ok "npm test: PASSED"
else
    warn "npm test: FALLO — ver output arriba"
    TEST_FAIL=1
fi

# test-full.js (21/21)
if [ -f /opt/sypnose/scripts/test-full.js ]; then
    info "test-full.js (full tests)..."
    if su -c "cd /opt/sypnose && /usr/bin/node scripts/test-full.js 2>&1" "$USER"; then
        ok "test-full.js: PASSED"
    else
        warn "test-full.js: FALLO — ver output arriba"
        TEST_FAIL=1
    fi
fi

# verify-kb-integrity.sh
if [ -f /opt/sypnose/scripts/verify-kb-integrity.sh ]; then
    info "verify-kb-integrity.sh..."
    if su -c "cd /opt/sypnose && /bin/bash scripts/verify-kb-integrity.sh 2>&1" "$USER"; then
        ok "verify-kb-integrity: OK"
    else
        warn "verify-kb-integrity: FALLO — Knowledge Hub puede no estar activo"
        TEST_FAIL=1
    fi
fi

if [ "$TEST_FAIL" -eq 1 ]; then
    warn "Algunos tests fallaron. NO arrancar daemons hasta resolver."
    echo -e "  Diagnostico:"
    echo -e "    npm test falla     → KB no accesible en :18791"
    echo -e "    verify falla       → verificar que KB esta activo"
    echo -e "    test-full falla    → leer error exacto en /opt/sypnose/"
fi

# Limpiar /tmp si se uso
rm -rf "$TMP_DIR" 2>/dev/null || true

# ============================================================
# PASO 12: Verificacion final — resumen
# ============================================================
echo ""
echo -e "${CYN}=========================================${RST}"
echo -e "${CYN}  VERIFICACION FINAL                    ${RST}"
echo -e "${CYN}=========================================${RST}"

check_item() {
    local label="$1"
    local cmd="$2"
    if eval "$cmd" &>/dev/null; then
        ok "$label"
    else
        warn "$label — PENDIENTE"
    fi
}

check_item "Node.js disponible"          "node --version"
check_item "tmux disponible"             "which tmux"
check_item "jq disponible"              "which jq"
check_item "/opt/sypnose instalado"     "[ -d /opt/sypnose/core ]"
check_item "/opt/sypnose/node_modules"  "[ -d /opt/sypnose/node_modules ]"
check_item "/opt/sypnose/.env existe"   "[ -f /opt/sypnose/.env ]"
check_item "config/clients.json"        "[ -f /opt/sypnose/config/clients.json ]"
check_item "/var/log/sypnose/ existe"   "[ -d /var/log/sypnose ]"
check_item "Knowledge Hub :18791"       "curl -sf http://localhost:18791/health"
check_item "CLIProxy :8317"             "curl -sf http://localhost:8317/"
check_item "SSE Hub codigo fuente"      "[ -f /home/shared/sypnose-hub/index.js ]"
check_item "sm-tmux instalado"          "[ -x /usr/local/bin/sm-tmux ]"
check_item "sypnose-coordinator.service" "[ -f /etc/systemd/system/sypnose-coordinator.service ]"
check_item "sypnose-sse.service"        "[ -f /etc/systemd/system/sypnose-sse.service ]"
check_item "Crontab Sypnose"            "su -c \"crontab -l 2>/dev/null\" $USER | grep -q 'SYPNOSE'"

echo ""
echo -e "${GRN}=========================================${RST}"
echo -e "${GRN}  INSTALACION COMPLETA                  ${RST}"
echo -e "${GRN}=========================================${RST}"
echo ""
echo -e "  ${YEL}PROXIMOS PASOS (obligatorio antes de arrancar):${RST}"
echo ""
echo -e "  1. Editar agentes en /opt/sypnose/config/clients.json"
echo -e "     Descubrir sesiones tmux activas:"
echo -e "       tmux list-sessions -F '#{session_name}'"
echo ""
echo -e "  2. Verificar paths de cada agente en clients.json:"
echo -e "       ls -d /home/$USER/mi-proyecto || echo 'NO EXISTE'"
echo ""
echo -e "  3. Desactivar PROACTIVE en /opt/sypnose/flags.json:"
echo -e "       \"PROACTIVE\": { \"enabled\": false }"
echo ""
echo -e "  4. Arrancar daemons:"
echo -e "       sudo systemctl start sypnose-coordinator sypnose-sse"
echo ""
echo -e "  5. Verificar logs:"
echo -e "       journalctl -u sypnose-coordinator -n 20 --no-pager"
echo -e "       curl -s http://localhost:18795/health"
echo ""
echo -e "  6. Dashboard:"
echo -e "       cd /opt/sypnose && node scripts/kb-dashboard.js"
echo ""
if [ "$TEST_FAIL" -eq 1 ]; then
    echo -e "  ${RED}ATENCION: Algunos tests fallaron. Resolver antes de arrancar daemons.${RST}"
    echo ""
fi

# Generar reporte de instalacion
cat > /opt/sypnose/INSTALL-REPORT.txt << EOF
=== SYPNOSE v5.2 INSTALL REPORT ===
Fecha: $(date -u)
Usuario: $USER
Node: $(node --version 2>/dev/null || echo "no disponible")
KB: $(curl -sf localhost:18791/health | python3 -c "import sys,json;print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "no disponible")
CLIProxy: $(curl -sf localhost:8317/ | python3 -c "import sys,json;print(json.load(sys.stdin).get('message','?'))" 2>/dev/null || echo "no disponible")
SSE Hub: $(curl -sf localhost:8095/health | python3 -c "import sys,json;print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "no disponible")
Tests: $([ "${TEST_FAIL:-1}" -eq 0 ] && echo "PASSED" || echo "FAILED o no ejecutados")
Script: install-sypnose-full.sh
EOF
chown "$USER":"$USER" /opt/sypnose/INSTALL-REPORT.txt
ok "Reporte guardado en /opt/sypnose/INSTALL-REPORT.txt"
