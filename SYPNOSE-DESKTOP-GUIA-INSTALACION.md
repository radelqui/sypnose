# SYPNOSE DESKTOP — GUÍA DE INSTALACIÓN DEFINITIVA

Version: 1.0 — 03-Abr-2026
Para: Cualquier Claude Desktop (Windows/Mac) conectándose a un servidor SYPNOSE
Verificado contra: sistema real de Carlos De La Torre

---

## SECCION 1: Qué es SYPNOSE Desktop

Claude Desktop actúa como **Service Manager (SM)** de SYPNOSE. No programa. No hace commits.
Su trabajo: coordinar agentes, crear planes, enviar tareas, verificar resultados.

Se conecta al servidor SYPNOSE vía túneles SSH automáticos. Desde tu PC local
ves el Knowledge Hub, envías planes a arquitectos en tmux, y recibes notificaciones
en tiempo real vía SSE.

### Arquitectura Desktop ↔ Servidor

```
TU PC LOCAL                           SERVIDOR SYPNOSE
┌────────────────────┐                ┌──────────────────────────┐
│ Claude Desktop     │    SSH         │                          │
│ (SM - Planifica)   │◄──Túneles───► │ Knowledge Hub (:18791)   │
│                    │                │ CLIProxy (:8317)         │
│ MCPs:              │                │ SSE Hub (:8095)          │
│  sypnose-tunnels   │                │ Agentes tmux             │
│  knowledge-hub     │                │ Boris                    │
│  boris             │                │ sm-tmux                  │
└────────────────────┘                └──────────────────────────┘
```

---

## SECCION 2: Requisitos en tu PC

| Requisito | Verificar | Instalar si falta |
|---|---|---|
| Claude Desktop | Abrir la app | https://claude.ai/download |
| Suscripción Claude | Plan Pro ($20) o Max ($100) | https://claude.ai |
| Node.js >= 18 | `node --version` | https://nodejs.org/ |
| Git | `git --version` | https://git-scm.com/download/win |
| SSH key | `ls ~/.ssh/id_rsa` | Pedir al admin del servidor |
| Python 3 | `python --version` | https://www.python.org/downloads/ (opcional, para LinkedIn) |

### Script de verificación (PowerShell)

```powershell
Write-Host "=== VERIFICACION REQUISITOS SYPNOSE DESKTOP ===" -ForegroundColor Cyan
foreach ($cmd in @("node", "git", "python")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $ver = & $cmd --version 2>&1 | Select-Object -First 1
        Write-Host "[OK] $cmd — $ver" -ForegroundColor Green
    } else {
        Write-Host "[!!] $cmd NO ENCONTRADO" -ForegroundColor Red
    }
}
if (Test-Path "$env:USERPROFILE\.ssh\id_rsa") {
    Write-Host "[OK] SSH key encontrada" -ForegroundColor Green
} else {
    Write-Host "[!!] SSH key NO encontrada — pedir al admin" -ForegroundColor Red
}
```

---

## SECCION 3: Datos que necesitas del administrador

Antes de empezar, el administrador del servidor SYPNOSE debe darte:

| Dato | Para qué | Ejemplo |
|---|---|---|
| IP del servidor | Conexión SSH | 217.216.48.91 |
| Puerto SSH | Conexión SSH (puede ser no-estándar) | 2024 |
| Usuario SSH | Autenticación | gestoria |
| SSH key (id_rsa) | Autenticación sin password | Archivo que copias a ~/.ssh/ |
| Token SSE Hub | Suscripción a notificaciones live | openssl rand -hex 32 |

NUNCA hardcodear estos datos en repos públicos (ver Sección 9, Error #2).

---

## SECCION 4: Instalar sypnose-tunnels (MCP que abre túneles automáticos)

Este MCP se carga cuando Desktop arranca y abre todos los túneles SSH.

### Paso 1 — Crear directorio

**Windows (PowerShell):**
```powershell
mkdir -Force "$env:USERPROFILE\.claude\mcp-servers\sypnose-tunnels"
cd "$env:USERPROFILE\.claude\mcp-servers\sypnose-tunnels"
```

**Mac/Linux:**
```bash
mkdir -p ~/.claude/mcp-servers/sypnose-tunnels
cd ~/.claude/mcp-servers/sypnose-tunnels
```

### Paso 2 — Crear package.json

```json
{
  "name": "sypnose-tunnels",
  "version": "1.1.0",
  "description": "MCP server — SSH tunnels automaticos para Sypnose",
  "type": "module",
  "main": "index.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ssh2": "^1.16.0"
  }
}
```

### Paso 3 — Crear index.js

El archivo index.js está en el repo: `github.com/radelqui/sypnose` en la
documentación del manual (Parte 4, Sección 4.4). Copiarlo completo.

El script abre estos túneles automáticos:

| Puerto local | Puerto remoto | Servicio |
|---|---|---|
| 3000 | 3000 | Codeman (web terminal) |
| 3002 | 3002 | Sypnose Agent (dashboard) |
| 18793 | 18793 | KB SSE (stream notificaciones) |
| 8317 | 8317 | CLIProxy (modelos IA gratis) |
| 18791 | 18791 | Knowledge Hub (API REST) |

### Paso 4 — Instalar dependencias

```bash
npm install
```
Output esperado: `added 2 packages, 0 vulnerabilities`

Si `ssh2` falla en Windows: necesitas build-essential
```powershell
npm install --global windows-build-tools
```

### Paso 5 — Verificar

```bash
node index.js
```
Debe mostrar `[sypnose-tunnels] SSH connected` y `5/5 tunnels open`.
Ctrl+C para salir (Desktop lo arrancará automáticamente).

---

## SECCION 5: Configurar claude_desktop_config.json

### Dónde está el archivo

| Sistema | Ruta |
|---|---|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Mac | `~/Library/Application Support/Claude/claude_desktop_config.json` |

**Abrirlo:**
```powershell
# Windows
notepad "$env:APPDATA\Claude\claude_desktop_config.json"
```

Si no existe, crearlo vacío: `{ "mcpServers": {} }`

### Configuración completa

Reemplazar `<IP>`, `<PUERTO>`, `<USUARIO>`, `<RUTA_SSH_KEY>` con tus datos:

```json
{
  "mcpServers": {
    "sypnose-tunnels": {
      "command": "node",
      "args": ["<RUTA_HOME>/.claude/mcp-servers/sypnose-tunnels/index.js"],
      "env": {
        "SSH_HOST": "<IP>",
        "SSH_PORT": "<PUERTO>",
        "SSH_USER": "<USUARIO>",
        "SSH_KEY_PATH": "<RUTA_SSH_KEY>"
      }
    },
    "knowledge-hub": {
      "command": "npx",
      "args": ["-y", "supergateway", "--sse", "http://localhost:18793/sse"]
    },
    "boris": {
      "command": "python",
      "args": ["-u", "<RUTA_HOME>/.boris/boris_spy.py"],
      "env": {
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```

**Windows paths ejemplo:**
- `<RUTA_HOME>` = `C:/Users/tu_usuario`
- `<RUTA_SSH_KEY>` = `C:/Users/tu_usuario/.ssh/id_rsa`

**Mac paths ejemplo:**
- `<RUTA_HOME>` = `/Users/tu_usuario`
- `<RUTA_SSH_KEY>` = `/Users/tu_usuario/.ssh/id_rsa`

### Reiniciar Claude Desktop

Cerrar completamente (no minimizar) y volver a abrir.

### Verificar MCPs

En la conversación de Desktop, preguntar: "dame el estado de los túneles"

Respuesta esperada: 5 túneles con `"connected": true`.

---

## SECCION 6: Instalar Boris (MCP de verificación)

Boris es un script Python que da herramientas de calidad al SM.

### Paso 1 — Crear directorio

```powershell
# Windows
mkdir -Force "$env:USERPROFILE\.boris"
```

### Paso 2 — Obtener boris_spy.py

Pedir al admin del servidor o copiar:
```powershell
scp -P <PUERTO> <USUARIO>@<IP>:/home/<USUARIO>/.boris/boris_spy.py "$env:USERPROFILE\.boris\"
```

### Paso 3 — Verificar

```powershell
python -u "$env:USERPROFILE\.boris\boris_spy.py"
```
Debe arrancar sin errores (espera input MCP en stdin).

Boris ya está incluido en el config de la Sección 5.

---

## SECCION 7: Configurar CLAUDE.md (identidad del SM)

Si usas Claude Code CLI además de Desktop, crea el directorio de trabajo:

```bash
mkdir ~/sypnose-sm && cd ~/sypnose-sm
git init
```

Crear `CLAUDE.md` con la identidad SM:

```markdown
# IDENTIDAD — SERVICE MANAGER SYPNOSE

Eres el Service Manager (SM) de Sypnose.
Tu trabajo: COORDINAR, no programar.

## Servidor
- IP: configurada en variables de entorno (NUNCA hardcodear)
- Acceso: via túneles SSH automáticos (sypnose-tunnels MCP)

## Herramientas
- KB: kb_list, kb_read, kb_save, kb_search, kb_inbox_check, kb_inbox_ack
- SSH: ssh -p $SYPNOSE_SSH_PORT $SYPNOSE_SSH_USER@$SYPNOSE_SSH_HOST "comando"
- sm-tmux: via SSH → sm-tmux send SESION PLAN
- Gemini Gate: sm-tmux valida planes automáticamente

## Flujo de trabajo
1. Leer estado y notificaciones del KB
2. Crear plan con protocolo sypnose-create-plan
3. Mostrar plan a Carlos → Carlos aprueba
4. Guardar en KB → sm-tmux send → arquitecto ejecuta
5. Verificar resultado con evidencia (BORIS)
6. Documentar en memoria

## Reglas inquebrantables
1. NUNCA programar — delegar a arquitectos via planes
2. NUNCA enviar plan sin aprobación de Carlos
3. Boris: sin evidencia no existe
4. Modelos baratos para todo excepto código core
5. NUNCA hardcodear credenciales en archivos
```

---

## SECCION 8: Skills y hooks (para Claude Code CLI)

Si usas Claude Code CLI como SM complementario a Desktop:

### Descargar skills desde el repo

```bash
cd ~/sypnose-sm
mkdir -p .claude/commands .claude/hooks

# Skills
curl -o .claude/commands/bios.md \
  https://raw.githubusercontent.com/radelqui/sypnose/main/.claude/skills/bios.md

curl -o .claude/commands/sypnose-create-plan.md \
  https://raw.githubusercontent.com/radelqui/sypnose/main/.claude/commands/sypnose-create-plan.md
```

### Hook de notificaciones automáticas

Crear `.claude/hooks/kb-inbox-check.sh` que revisa inbox del KB en cada prompt.
El script está documentado en `INSTALL-SM-REMOTO.md` del repo `radelqui/sypnose` (Paso 9).

### Configurar settings.json para Claude Code CLI

```json
{
  "mcpServers": {
    "knowledge-hub": {
      "command": "npx",
      "args": ["-y", "supergateway", "--sse", "http://localhost:18793/sse"]
    }
  },
  "permissions": {
    "allow": [
      "Bash(ssh:*)",
      "mcp__knowledge-hub__*",
      "Read", "Write", "Glob", "Grep"
    ]
  }
}
```

---

## SECCION 9: Errores conocidos y cómo evitarlos

Estos 10 errores se descubrieron durante instalaciones reales. Están CORREGIDOS
en las versiones actuales de los repos, pero si instalas desde cero, verifica.

### ERROR 1 (CRÍTICO): Skills no cargan en Claude Code CLI 2.1+

Claude Code v2.1+ requiere formato directorio, no archivo plano:
```
INCORRECTO: .claude/skills/daily.md
CORRECTO:   .claude/skills/daily/SKILL.md
```

Fix si tienes formato plano:
```bash
cd .claude/skills/
for f in *.md; do name="${f%.md}"; mkdir -p "$name"; mv "$f" "$name/SKILL.md"; done
```

### ERROR 2 (CRÍTICO): Credenciales hardcodeadas en repos

NUNCA poner IP, puerto SSH, usuario o API keys en archivos que van a GitHub.
Usar variables de entorno: `$SYPNOSE_SSH_HOST`, `$SYPNOSE_SSH_PORT`, `$SYPNOSE_SSH_USER`.

Verificar antes de push:
```powershell
Select-String -Path CLAUDE.md,*.ps1,README.md -Pattern "217\.|gestoria@|46842516|HUYGHU"
```

### ERROR 3 (CRÍTICO): Datos personales expuestos (DNI, empresa)

Revisar CLAUDE.md buscando PII antes de cada push.
No incluir DNI, pasaporte, nombre de empresa confidencial.

### ERROR 4 (ALTO): Archivos referenciados que no existen

Todo archivo mencionado en CLAUDE.md debe existir en el repo.
Crear con contenido inicial vacío si es necesario:
```powershell
'[]' | Out-File -Encoding utf8 data\contactos.json
```

### ERROR 5 (ALTO): Submodulo git como dependencia obligatoria

No usar submodulos para dependencias opcionales. Usar `git clone` explícito
y opcional.

### ERROR 6 (ALTO): Python no verificado por el instalador

El install.ps1 debe verificar TODAS las dependencias: Claude CLI, Git,
Python, Node.js. Si falta alguna, avisar cómo instalarla.

### ERROR 7 (MEDIO): Opus 4.6 timeout con múltiples tool calls

Claude Desktop con Opus 4.6 da timeout cuando intenta hacer 6-8 llamadas
MCP en una sola respuesta. Descubierto en marzo 2026.

Solución: limitar a 1-2 tool calls por respuesta. Pedir info paso a paso,
no "diagnóstico completo". Crear `sm-status.sh` en el servidor que
consolide todo el estado en 1 sola llamada SSH.

### ERROR 8 (MEDIO): La palabra "kb" dispara cascada de llamadas

Cuando el SM recibe "revisa el kb" intenta hacer kb_list + kb_context +
kb_search + kb_read = 4-8 llamadas = timeout.

Solución: ser específico. En vez de "revisa el kb", decir
"lee la notification más reciente del kb" (1 sola llamada).

### ERROR 9 (MEDIO): Flujos de trabajo duplicados en CLAUDE.md

Tener dos secciones que dicen lo mismo confunde al agente.
Un solo flujo de trabajo, una sola fuente de verdad.

### ERROR 10 (BAJO): Campo user_invocable no es estándar

No usar campos no documentados en frontmatter de skills.
Campos válidos: `name`, `description`.

---

## SECCION 10: Cómo Desktop y CLI trabajan juntos

```
Claude Desktop (SM)           Claude Code CLI (agentes)
        │                              │
        │  1. Lee KB, crea plan        │
        │  2. Carlos aprueba           │
        │  3. Guarda plan en KB ──────►│  4. Agente lee plan del KB
        │                              │  5. Agente ejecuta
        │  7. SM verifica resultado◄───│  6. Agente reporta en KB
        │  8. Siguiente tarea          │
```

Desktop supervisa. CLI ejecuta. Ambos comparten el KB como fuente de verdad.

---

## SECCION 11: Verificación completa post-instalación

### Desde PowerShell

```powershell
Write-Host "=== VERIFICACION SYPNOSE DESKTOP ===" -ForegroundColor Cyan

# 1. Dependencias
foreach ($cmd in @("node", "git")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        Write-Host "[OK] $cmd" -ForegroundColor Green
    } else { Write-Host "[!!] $cmd FALTA" -ForegroundColor Red }
}

# 2. SSH key
if (Test-Path "$env:USERPROFILE\.ssh\id_rsa") {
    Write-Host "[OK] SSH key" -ForegroundColor Green
} else { Write-Host "[!!] SSH key FALTA" -ForegroundColor Red }

# 3. sypnose-tunnels
$tunnelDir = "$env:USERPROFILE\.claude\mcp-servers\sypnose-tunnels"
if (Test-Path "$tunnelDir\index.js") {
    Write-Host "[OK] sypnose-tunnels instalado" -ForegroundColor Green
} else { Write-Host "[!!] sypnose-tunnels FALTA" -ForegroundColor Red }

# 4. Boris
if (Test-Path "$env:USERPROFILE\.boris\boris_spy.py") {
    Write-Host "[OK] Boris instalado" -ForegroundColor Green
} else { Write-Host "[--] Boris no instalado (opcional si corre en servidor)" -ForegroundColor Yellow }

# 5. Config Desktop
$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"
if (Test-Path $configPath) {
    $cfg = Get-Content $configPath | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($cfg.mcpServers.'sypnose-tunnels') {
        Write-Host "[OK] sypnose-tunnels en config" -ForegroundColor Green
    } else { Write-Host "[!!] sypnose-tunnels NO está en config" -ForegroundColor Red }
    if ($cfg.mcpServers.'knowledge-hub') {
        Write-Host "[OK] knowledge-hub en config" -ForegroundColor Green
    } else { Write-Host "[!!] knowledge-hub NO está en config" -ForegroundColor Red }
} else { Write-Host "[!!] claude_desktop_config.json NO EXISTE" -ForegroundColor Red }

# 6. Seguridad
$cfgContent = Get-Content $configPath -Raw -ErrorAction SilentlyContinue
if ($cfgContent -match "217\." -or $cfgContent -match "gestoria@") {
    Write-Host "[!!] CREDENCIALES REALES DETECTADAS EN CONFIG (no es error, pero cuidar)" -ForegroundColor Yellow
}

Write-Host "=== FIN ===" -ForegroundColor Cyan
```

### Desde Claude Desktop (después de reiniciar)

Escribir: **"dame el estado de los túneles"**

Respuesta esperada:
```json
{
  "tunnels": {
    "knowledge-hub": { "port": 18791, "connected": true },
    "cliproxyapi": { "port": 8317, "connected": true },
    "kb-sse": { "port": 18793, "connected": true },
    "sypnose-agent": { "port": 3002, "connected": true },
    "codeman": { "port": 3000, "connected": true }
  }
}
```

Si algún túnel dice `"connected": false`, verificar:
1. SSH key correcta y en el path configurado
2. Servidor encendido y accesible
3. Puerto SSH correcto
4. Servicio del servidor corriendo (curl desde el servidor)

---

## SECCION 12: Troubleshooting Desktop

| Problema | Diagnóstico | Solución |
|---|---|---|
| MCPs no aparecen | Abrir Desktop settings → MCPs | Verificar claude_desktop_config.json syntax JSON |
| Túneles "connected: false" | tunnel_status | Verificar SSH key, IP, puerto, servidor encendido |
| KB no responde | kb_list timeout | Verificar túnel 18791/18793 + KB service en servidor |
| Timeout en respuestas | Opus hace 6+ tool calls | Pedir info paso a paso, no "diagnóstico completo" |
| "kb" cuelga Desktop | Cascada de llamadas | Ser específico: "lee notificación X", no "revisa kb" |
| Skills no aparecen (CLI) | ls .claude/skills/ | Formato directorio: skills/nombre/SKILL.md |
| Boris no conecta | python boris_spy.py | Verificar Python instalado y path correcto |
| npm install falla (ssh2) | Error compilación | `npm install --global windows-build-tools` primero |
| supergateway timeout | npx tarda | Primera vez tarda en descargar, esperar |
| Desktop no arranca después de config | JSON syntax error | Validar JSON: `cat config.json \| python -m json.tool` |

---

## Checklist final

```
[ ] Node.js >= 18 instalado
[ ] Git instalado
[ ] SSH key copiada a ~/.ssh/id_rsa
[ ] IP, puerto, usuario del servidor obtenidos del admin
[ ] sypnose-tunnels creado en ~/.claude/mcp-servers/sypnose-tunnels/
[ ] npm install en sypnose-tunnels (ssh2 + mcp sdk)
[ ] claude_desktop_config.json configurado con 3 MCPs
[ ] Desktop reiniciado
[ ] 5 túneles "connected: true"
[ ] KB accesible (kb_list devuelve datos)
[ ] NUNCA credenciales hardcodeadas en repos
[ ] Skills en formato directorio (CLI)
```
