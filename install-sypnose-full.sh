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
# PASO 2: Instalar Knowledge Hub (:18791)
# ============================================================
info "PASO 2: Knowledge Hub (:18791)"
PREREQ_KB="$SCRIPT_DIR/prerequisites/knowledge-hub"
if curl -sf http://localhost:18791/health &>/dev/null; then
    ok "Knowledge Hub ya activo en :18791"
elif [ -d "$PREREQ_KB/src" ]; then
    info "Instalando KB desde prerequisites/knowledge-hub/..."
    mkdir -p /opt/knowledge-hub
    cp -r "$PREREQ_KB"/src "$PREREQ_KB"/package.json /opt/knowledge-hub/
    cp "$PREREQ_KB"/package-lock.json /opt/knowledge-hub/ 2>/dev/null || true
    chown -R "$USER":"$USER" /opt/knowledge-hub
    mkdir -p /opt/knowledge-hub/data
    chown "$USER":"$USER" /opt/knowledge-hub/data
    su -c "cd /opt/knowledge-hub && /usr/bin/npm install --silent" "$USER" || fail "npm install KB fallo"
    SVC="$SCRIPT_DIR/prerequisites/knowledge-hub.service"
    if [ -f "$SVC" ]; then
        sed "s|<USUARIO>|$USER|g" "$SVC" > /etc/systemd/system/knowledge-hub.service
    fi
    systemctl daemon-reload
    systemctl enable --now knowledge-hub
    sleep 3
    curl -sf http://localhost:18791/health &>/dev/null && ok "KB instalado y corriendo" || fail "KB no responde"
else
    fail "KB no activo y prerequisites/knowledge-hub/ no encontrado"
fi

# ============================================================
# PASO 3: Instalar CLIProxy (:8317)
# ============================================================
info "PASO 3: CLIProxy (:8317)"
if curl -sf http://localhost:8317/ &>/dev/null; then
    ok "CLIProxy ya activo en :8317"
else
    CDIR="$SCRIPT_DIR/prerequisites/cliproxy"
    if [ -f "$CDIR/cli-proxy-api" ]; then
        mkdir -p /home/$USER/cliproxyapi/logs
        cp "$CDIR"/cli-proxy-api "$CDIR"/config.yaml /home/$USER/cliproxyapi/
        chmod +x /home/$USER/cliproxyapi/cli-proxy-api
        chown -R "$USER":"$USER" /home/$USER/cliproxyapi
        warn "CLIProxy copiado — EDITAR config.yaml con tus API keys"
    else
        warn "CLIProxy binario no encontrado. Descargar de GitHub Releases."
    fi
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
# PASO 5: Instalar SSE Hub (:8095)
# ============================================================
info "PASO 5: SSE Hub (:8095)"
SSE_SRC="$SCRIPT_DIR/prerequisites/sypnose-hub"
SSE_DST="/home/shared/sypnose-hub"
if [ -f "$SSE_DST/index.js" ]; then
    ok "SSE Hub ya existe en $SSE_DST"
elif [ -f "$SSE_SRC/index.js" ]; then
    mkdir -p "$SSE_DST"
    cp "$SSE_SRC"/* "$SSE_DST/"
    chown -R "$USER":"$USER" "$SSE_DST"
    su -c "cd $SSE_DST && /usr/bin/npm install --silent" "$USER" 2>/dev/null
    HUB_TOKEN=$(openssl rand -hex 32)
    mkdir -p "$HOME_DIR/.config"
    printf "SYPNOSE_HUB_TOKEN=%s\nPORT=8095\n" "$HUB_TOKEN" > "$HOME_DIR/.config/sypnose-hub.env"
    chmod 600 "$HOME_DIR/.config/sypnose-hub.env"
    chown "$USER":"$USER" "$HOME_DIR/.config/sypnose-hub.env"
    ok "SSE Hub instalado. Token generado."
else
    warn "SSE Hub no encontrado en prerequisites/"
fi

# ============================================================
# PASO 6: Instalar Channel MCP
# ============================================================
info "PASO 6: Channel MCP"
CH_SRC="$SCRIPT_DIR/prerequisites/channel"
CH_DST="/home/shared/sypnose-hub/channel"
if [ -d "$CH_DST" ] && [ -f "$CH_DST/sypnose-channel.ts" ]; then
    ok "Channel MCP ya existe"
elif [ -f "$CH_SRC/sypnose-channel.ts" ]; then
    mkdir -p "$CH_DST"
    cp "$CH_SRC"/* "$CH_DST/"
    chown -R "$USER":"$USER" "$CH_DST"
    BUN=$(su -c 'echo ~/.bun/bin/bun' "$USER" 2>/dev/null | tr -d '\n')
    [ -x "$BUN" ] && su -c "cd $CH_DST && $BUN install --silent" "$USER" 2>/dev/null && ok "Channel MCP instalado" || warn "bun install pendiente"
else
    warn "Channel MCP no encontrado en prerequisites/"
fi

# ============================================================
# PASO 7: Instalar Boris hooks
# ============================================================
info "PASO 7: Boris hooks"
BORIS_SRC="$SCRIPT_DIR/prerequisites/boris"
BORIS_TPL="/opt/sypnose/templates/boris"
if [ -d "$BORIS_SRC" ] && ls "$BORIS_SRC"/*.sh &>/dev/null; then
    mkdir -p "$BORIS_TPL/hooks" "$BORIS_TPL/rules"
    cp "$BORIS_SRC"/*.sh "$BORIS_TPL/hooks/" 2>/dev/null
    cp "$BORIS_SRC"/*.md "$BORIS_TPL/rules/" 2>/dev/null
    chmod +x "$BORIS_TPL/hooks/"*.sh 2>/dev/null
    chown -R "$USER":"$USER" "$BORIS_TPL"
    COUNT=$(ls "$BORIS_TPL/hooks/"*.sh 2>/dev/null | wc -l)
    ok "Boris: $COUNT hooks copiados a templates/boris/"
else
    warn "Boris hooks no encontrados en prerequisites/boris/"
    mkdir -p "$BORIS_TPL"
fi

# ============================================================
# PASO 8: Instalar sm-tmux + OpenClaw
# ============================================================
info "PASO 8a: sm-tmux"
if [ -x /usr/local/bin/sm-tmux ]; then
    ok "sm-tmux ya instalado"
else
    SM="$SCRIPT_DIR/prerequisites/sm-tmux/sm-tmux.sh"
    [ ! -f "$SM" ] && SM="$SCRIPT_DIR/prerequisites/sm-tmux.sh"
    if [ -f "$SM" ]; then
        cp "$SM" /usr/local/bin/sm-tmux && chmod +x /usr/local/bin/sm-tmux
        ok "sm-tmux instalado"
    else
        warn "sm-tmux no encontrado en prerequisites/"
    fi
fi
su -c "mkdir -p ~/.openclaw/pending-plans ~/.openclaw/plan-cache ~/.config" "$USER" 2>/dev/null
info "PASO 8b: OpenClaw"
OC_SRC="$SCRIPT_DIR/prerequisites/openclaw"
OC_DST="/home/$USER/openclaw"
if [ -d "$OC_SRC" ] && [ -f "$OC_SRC/health_api.py" ]; then
    mkdir -p "$OC_DST"
    cp "$OC_SRC"/*.py "$OC_DST/"
    cp -r "$OC_SRC"/config "$OC_DST/" 2>/dev/null
    chown -R "$USER":"$USER" "$OC_DST"
    ok "OpenClaw copiado a $OC_DST"
elif [ -d "$OC_DST" ]; then
    ok "OpenClaw ya existe en $OC_DST"
else
    warn "OpenClaw no encontrado en prerequisites/"
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
