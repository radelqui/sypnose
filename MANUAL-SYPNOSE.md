# MANUAL SYPNOSE — De Cero a Operativo
**Version:** 1.0 — 28-Mar-2026
**Autor:** Carlos De La Torre + Sypnose
**Descripcion:** Guia completa para instalar y configurar el sistema Sypnose de orquestacion IA desde un servidor vacio hasta un sistema multi-agente operativo 24/7.

---

## TABLA DE CONTENIDOS MAESTRA

### Parte 1 — Que es Sypnose
- [1.1 Definicion y etimologia](#11-definicion-y-etimologia)
- [1.2 Los tres pilares fundamentales](#12-los-tres-pilares-fundamentales)
- [1.3 Arquitectura del sistema](#13-arquitectura-del-sistema)
- [1.4 Diagrama ASCII completo](#14-diagrama-ascii-del-sistema-completo)
- [1.5 Componentes explicados](#15-componentes-explicados)

### Parte 2 — Preparar el Servidor
- [2.1 Requisitos minimos](#21-requisitos-minimos)
- [2.2 Seguridad: UFW, Fail2ban, SSH hardening](#22-seguridad-ufw-fail2ban-ssh-hardening)
- [2.3 Docker y Docker Compose](#23-docker-y-docker-compose)
- [2.4 Node.js via nvm](#24-nodejs-via-nvm)
- [2.5 Python 3.11+, Git, tmux](#25-python-311-git-tmux)
- [2.6 Configurar SWAP](#26-configurar-swap)
- [2.7 Verificacion final del servidor](#27-verificacion-final-del-servidor)

### Parte 3 — Instalar Claude Code
- [3.1 Instalacion npm](#31-instalacion-npm)
- [3.2 Version recomendada y bloqueo de auto-update](#32-version-recomendada-y-bloqueo-de-auto-update)
- [3.3 Configurar API key](#33-configurar-api-key)
- [3.4 Settings global estandar Sypnose](#34-settings-global-estandar-sypnose)
- [3.5 Flag --dangerously-skip-permissions](#35-flag---dangerously-skip-permissions)
- [3.6 Alias en .bashrc](#36-alias-en-bashrc)
- [3.7 Verificacion final](#37-verificacion-final)

### Parte 4 — Configurar Claude Desktop (Windows/Mac)
- [4.1 Instalar Claude Desktop](#41-instalar-claude-desktop)
- [4.2 Donde esta claude_desktop_config.json](#42-donde-esta-claude_desktop_configjson)
- [4.3 MCPs a configurar](#43-mcps-a-configurar)
- [4.4 MCP Knowledge Hub (via tunel SSH)](#44-mcp-knowledge-hub-via-tunel-ssh)
- [4.5 MCP Boris](#45-mcp-boris)
- [4.6 MCP Playwright](#46-mcp-playwright)
- [4.7 Skills a instalar](#47-skills-a-instalar)
- [4.8 Settings del proyecto local](#48-settings-del-proyecto-local)
- [4.9 Configuracion completa — ejemplo real del sistema de Carlos](#49-configuracion-completa--ejemplo-real-del-sistema-de-carlos)
- [4.10 Verificacion final](#410-verificacion-final)

### Parte 5 — Configurar Claude Code Chat Web
- [5.1 Que es Claude Code Chat Web](#51-que-es-claude-code-chat-web)
- [5.2 Diferencias con Desktop](#52-diferencias-con-desktop)
- [5.3 Configurar MCPs en Claude Code CLI](#53-configurar-mcps-en-claude-code-cli)
- [5.4 Instalar Skills](#54-instalar-skills)
- [5.5 Settings del proyecto (.claude/settings.local.json)](#55-settings-del-proyecto-claudesettingslocaljson)
- [5.6 Configurar auto mode (sin pedir permisos)](#56-configurar-auto-mode-sin-pedir-permisos)
- [5.7 Limitaciones conocidas](#57-limitaciones-conocidas)

### Parte 6 — Instalar Knowledge Hub (Bus de Comunicacion)
- [6.1 Que es Knowledge Hub](#61-que-es-knowledge-hub)
- [6.2 Arquitectura del sistema](#62-arquitectura-del-sistema)
- [6.3 Instalacion en el servidor](#63-instalacion-en-el-servidor)
- [6.4 Configurar systemd (arranque automatico)](#64-configurar-systemd-arranque-automatico)
- [6.5 Verificar que KB funciona](#65-verificar-que-kb-funciona)
- [6.6 Endpoints disponibles](#66-endpoints-disponibles)
- [6.7 Herramientas MCP del KB](#67-herramientas-mcp-del-kb)
- [6.8 Protocolo de comunicacion SM y arquitectos](#68-protocolo-de-comunicacion-sm-y-arquitectos)
- [6.9 Bus de tareas — formato estandar](#69-bus-de-tareas--formato-estandar)
- [6.10 Ejemplo de flujo completo de una tarea](#610-ejemplo-de-flujo-completo-de-una-tarea)
- [6.11 Que puede salir mal](#611-que-puede-salir-mal)

### Parte 7 — Instalar Boris v6.2 (Verificacion)
- [7.1 Que es Boris](#71-que-es-boris)
- [7.2 Las 5 Leyes de Hierro](#72-las-5-leyes-de-hierro)
- [7.3 Los 5 hooks de Boris](#73-los-5-hooks-de-boris)
- [7.4 Instalacion paso a paso](#74-instalacion-paso-a-paso)
- [7.5 Estructura de .brain/](#75-estructura-de-brain)
- [7.6 Formato de evidencia](#76-formato-de-evidencia)
- [7.7 Flujo completo de trabajo con Boris](#77-flujo-completo-de-trabajo-con-boris)
- [7.8 Que puede salir mal](#78-que-puede-salir-mal)

### Parte 8 — Configurar Arquitectos (cada proyecto)
- [8.1 Crear sesion tmux por proyecto](#81-crear-sesion-tmux-por-proyecto)
- [8.2 settings.json estandar](#82-settingsjson-estandar)
- [8.3 settings.local.json](#83-settingslocaljson)
- [8.4 Las 3 reglas obligatorias en .claude/rules/](#84-las-3-reglas-obligatorias-en-clauderules)
- [8.5 .mcp.json — MCPs por proyecto](#85-mcpjson--mcps-por-proyecto)
- [8.6 Estructura inicial de .brain/](#86-estructura-inicial-de-brain)
- [8.7 CLAUDE.md del proyecto — template](#87-claudemd-del-proyecto--template)
- [8.8 Tabla comparativa: lo que debe ser IGUAL en todos](#88-tabla-comparativa-lo-que-debe-ser-igual-en-todos)
- [8.9 Ejemplo completo: configurar un arquitecto desde cero](#89-ejemplo-completo-configurar-un-arquitecto-desde-cero)

### Parte 9 — Instalar Sypnose Agent Dashboard (Codeman)
- [9.1 Que es Codeman](#91-que-es-codeman)
- [9.2 Instalar en el servidor](#92-instalar-en-el-servidor)
- [9.3 Crear servicio systemd](#93-crear-servicio-systemd)
- [9.4 Configurar Codeman](#94-configurar-codeman)
- [9.5 Conectar proyectos existentes](#95-conectar-proyectos-existentes)
- [9.6 Acceso desde tu PC](#96-acceso-desde-tu-pc)
- [9.7 Branding Sypnose (colores Anthropic)](#97-branding-sypnose-colores-anthropic)
- [9.8 Monitor de sesiones](#98-monitor-de-sesiones)
- [9.9 Que puede salir mal](#99-que-puede-salir-mal)

### Parte 10 — Instalar y Configurar OpenClaw (Supervisor)
- [10.1 Instalacion](#101--instalacion)
- [10.2 Configuracion initial (openclaw.json)](#102-configuracion-inicial)
- [10.3 Workspace: SOUL.md y HEARTBEAT.md](#103-workspace-soulmd-y-heartbeatmd)
- [10.4 Conectar al Knowledge Hub](#104-conectar-al-knowledge-hub)
- [10.5 Configurar alertas Telegram](#105-configurar-alertas-telegram)
- [10.6 Reglas de auditoria](#106-reglas-de-auditoria)
- [10.7 sm-hooks (loop de control)](#107-sm-hooks-loop-de-control)
- [10.8 Verificacion final](#108-verificacion-final)

### Parte 11 — A2A, MsgHub Channels y mejoras 31-Mar-2026 (archivo: PART-11-A2A-CHANNELS.md)
- [11.1 A2A — Agent-to-Agent Direct Messaging](#111-a2a--agent-to-agent-direct-messaging)
- [11.2 MsgHub Channels — Broadcast Pub/Sub](#112-msghub-channels--broadcast-pubsub)
- [11.3 A2A Request Timeout](#113-a2a-request-timeout)
- [11.4 Channel SSE Push](#114-channel-sse-push)
- [11.5 sm-tmux mejoras A2A](#115-sm-tmux-mejoras-a2a)
- [11.6 Hook kb-inbox-check.sh reescrito](#116-hook-kb-inbox-checksh-reescrito)
- [11.7 CLAUDE.md global — Regla 0](#117-claudemd-global--regla-0)
- [11.8 Prompt de instalacion para arquitecto](#118-prompt-de-instalacion-para-arquitecto)

### Apendices
- [Apendice A — Matriz de Modelos](#apendice-a)
- [Apendice B — SypnoseProxy (antes CLIProxy)](#apendice-b)
- [Apendice C — Troubleshooting Comun](#apendice-c)
- [Apendice D — Checklist Post-Instalacion](#apendice-d)
- [Apendice E — Security Hardening](#apendice-e)
- [Apendice F — Comandos Utiles del Dia a Dia](#apendice-f)

---

# Manual Sypnose — Partes 1 a 3
## Guia de instalacion y configuracion desde cero

---

## INDICE DE CONTENIDOS

### Parte 1 — Que es Sypnose
- 1.1 Definicion y etimologia
- 1.2 Los tres pilares fundamentales
- 1.3 Arquitectura del sistema
- 1.4 Diagrama ASCII completo
- 1.5 Componentes explicados

### Parte 2 — Preparar el Servidor
- 2.1 Requisitos minimos
- 2.2 Seguridad: UFW, Fail2ban, SSH hardening
- 2.3 Docker y Docker Compose
- 2.4 Node.js via nvm
- 2.5 Python 3.11+, Git, tmux
- 2.6 Configurar SWAP
- 2.7 Verificacion final del servidor

### Parte 3 — Instalar Claude Code
- 3.1 Instalacion npm
- 3.2 Version recomendada y bloqueo de auto-update
- 3.3 Configurar API key
- 3.4 Settings global estandar Sypnose
- 3.5 Flag --dangerously-skip-permissions
- 3.6 Alias en .bashrc
- 3.7 Verificacion final

---

---

# PARTE 1 — QUE ES SYPNOSE

## 1.1 Definicion y etimologia

**Sypnose** es un neologismo inventado por Carlos De La Torre que combina tres palabras:

| Raiz | Concepto |
|------|----------|
| **Synapse** | conexion entre neuronas — los agentes IA conectados entre si |
| **Synopsis** | vision global, resumen estructurado — el sistema ve todo el contexto |
| **Hypnosis** | eco lejano — estado de foco profundo de la IA en su tarea |

**Definicion corta:** Sypnose es un "sistema nervioso" para que tus agentes IA trabajen como un equipo humano bien organizado.

**Definicion tecnica:** Metodologia de trabajo para Claude Code donde varios agentes con roles claros se comunican entre si siguiendo reglas precisas, preservando contexto entre sesiones, y verificando todo resultado antes de darlo por terminado.

Sypnose no es una aplicacion que instalas y listo. Es una metodologia — un conjunto de herramientas, reglas y flujos que, combinados, hacen que los agentes IA trabajen de forma predecible, trazable y economica.

---

## 1.2 Los tres pilares fundamentales

### PILAR 1 — MEMORIA (Knowledge Hub)

El problema clasico de los agentes IA es que olvidan. Cada sesion empieza desde cero. Si un agente trabaja 4 horas y el contexto se resetea, ese trabajo puede perderse o repetirse.

Sypnose resuelve esto con el **Knowledge Hub (KB)**: una base de datos compartida donde todos los agentes leen y escriben. El KB es la memoria del sistema.

- Cualquier agente puede guardar informacion: `kb_save key="tarea-1" value="completada"`
- Cualquier agente puede leer lo que otro escribio: `kb_read key="tarea-1"`
- El SM (Service Manager) manda tareas via KB, los arquitectos responden via KB
- El historial nunca se pierde aunque el agente se reinicie

**Resultado**: el trabajo nunca se repite, el contexto nunca se pierde.

### PILAR 2 — CALIDAD (Boris)

El problema clasico de los agentes IA es que dicen "deberia funcionar" sin verificar nada. Boris es el sistema de control de calidad de Sypnose.

**Boris** instala hooks en Claude Code que bloquean git commit si el agente no proporciona evidencia concreta de que su cambio funciona. No es una sugerencia. Es un bloqueo deterministico con `exit 2` que el agente no puede saltarse.

Antes de hacer commit el agente debe:
1. Ejecutar el cambio (test, curl, UI check, lo que corresponda)
2. Escribir evidencia concreta en `.brain/last-verification.md`
3. Solo entonces el hook permite el commit

Frases vagas como "deberia funcionar" o "creo que esta correcto" son detectadas y bloqueadas automaticamente.

**Resultado**: codigo que llega a produccion ha sido verificado de verdad, no por declaracion.

### PILAR 3 — AHORRO (80% modelos gratuitos)

Claude Sonnet es excelente pero cuesta dinero. La mayoria de las tareas de un sistema de agentes no requieren el modelo mas caro.

Sypnose usa **SypnoseProxy** (antes CLIProxyAPI): un router Go con 42+ modelos de 6 providers bajo un solo endpoint. Los agentes usan modelos baratos o gratuitos para tareas de baja criticidad, y reservan Sonnet para las tareas que realmente lo necesitan.

| Tipo de tarea | Modelo recomendado | Coste |
|--------------|-------------------|-------|
| Codigo critico, arquitectura | Claude Sonnet | $$ |
| Scripts utilitarios | Qwen 3 | Gratis |
| Comandos bash | DeepSeek | $ |
| Documentacion | Gemini Pro | $ |
| Monitoreo, healthchecks | Gemini Flash | Gratis |

**Resultado**: 60-80% de reduccion de costos manteniendo la calidad donde importa.

**Regla fija de Sypnose**: cargar Boris + KB al iniciar cada sesion. Usar modelos gratuitos para agentes secundarios. Esta regla no es opcional — es el fundamento del sistema.

---

## 1.3 Arquitectura del sistema

Sypnose tiene cuatro capas de responsabilidad:

**Capa 1 — Humano (Carlos)**
Decide la estrategia. Aprueba planes. Da el OK final. No escribe codigo ni ejecuta comandos directamente. Su herramienta es Claude Desktop Chat (el SM).

**Capa 2 — SM (Service Manager)**
Claude Desktop Chat actuando como coordinador. Recibe instrucciones del humano, crea planes, los envia a los arquitectos via Knowledge Hub, verifica que los resultados sean correctos, reporta al humano. El SM no programa. Solo coordina.

**Capa 3 — Arquitectos**
Claude Code CLI corriendo en el servidor. Cada proyecto tiene su propio arquitecto en una sesion tmux separada. Los arquitectos reciben tareas via KB, las ejecutan (delegando a sub-agentes si son complejas), verifican con Boris, y notifican al SM via KB cuando terminan.

**Capa 4 — Auditores y herramientas**
- **OpenClaw**: supervisa la plataforma 24/7, audita calidad
- **Gemini Quality Gate**: valida planes antes de ejecutar (6 etiquetas obligatorias)
- **Knowledge Hub**: memoria compartida entre todas las capas
- **SypnoseProxy**: acceso a 42+ modelos IA via un solo endpoint

---

## 1.4 Diagrama ASCII del sistema completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYPNOSE SYSTEM                              │
│                                                                     │
│  ┌──────────────┐         ┌─────────────────────────────────────┐  │
│  │   HUMANO     │         │           PC DEL USUARIO            │  │
│  │   Carlos     │◄───────►│                                     │  │
│  │              │         │  ┌─────────────────────────────┐   │  │
│  │  Decide      │         │  │  SM (Service Manager)       │   │  │
│  │  Aprueba     │         │  │  Claude Desktop Chat        │   │  │
│  │  Supervisa   │         │  │                             │   │  │
│  └──────────────┘         │  │  - Crea planes              │   │  │
│                           │  │  - Envia tareas via KB      │   │  │
│                           │  │  - Verifica resultados      │   │  │
│                           │  │  - Reporta al humano        │   │  │
│                           │  └──────────┬──────────────────┘   │  │
│                           │             │  MCPs:               │  │
│                           │             │  - knowledge-hub     │  │
│                           │             │  - ssh-mcp           │  │
│                           │             │  - sypnose-tunnels   │  │
│                           └─────────────┼───────────────────────┘  │
│                                         │                          │
│                          SSH Tunnel (puerto 2024)                  │
│                          KB SSE  (puerto 18793)                    │
│                          CLIProxy (puerto 8317)                    │
│                                         │                          │
│                           ┌─────────────▼───────────────────────┐  │
│                           │        SERVIDOR CONTABO              │  │
│                           │  IP: 217.216.48.91  Puerto: 2024    │  │
│                           │  Usuario: gestoria                  │  │
│                           │                                     │  │
│                           │  ┌──────────────────────────────┐  │  │
│                           │  │  Knowledge Hub (KB)          │  │  │
│                           │  │  Puerto: 18793 (SSE)         │  │  │
│                           │  │  Puerto: 18791 (API)         │  │  │
│                           │  │  Memoria compartida entre    │  │  │
│                           │  │  SM y todos los arquitectos  │  │  │
│                           │  └──────────────────────────────┘  │  │
│                           │                                     │  │
│                           │  ┌─────────────┐ ┌──────────────┐  │  │
│                           │  │ Arquitecto 1│ │ Arquitecto 2 │  │  │
│                           │  │ Claude Code │ │ Claude Code  │  │  │
│                           │  │ tmux:proj1  │ │ tmux:proj2   │  │  │
│                           │  │             │ │              │  │  │
│                           │  │ Boris hooks │ │ Boris hooks  │  │  │
│                           │  │ Cozempic    │ │ Cozempic     │  │  │
│                           │  └──────┬──────┘ └──────┬───────┘  │  │
│                           │         │               │          │  │
│                           │  ┌──────▼───────────────▼───────┐  │  │
│                           │  │     Sub-agentes (Task)       │  │  │
│                           │  │     model: sonnet (siempre)  │  │  │
│                           │  │     Ejecutan codigo          │  │  │
│                           │  └──────────────────────────────┘  │  │
│                           │                                     │  │
│                           │  ┌──────────────────────────────┐  │  │
│                           │  │  SypnoseProxy (CLIProxyAPI)  │  │  │
│                           │  │  Puerto: 8317                │  │  │
│                           │  │  42+ modelos, 6 providers    │  │  │
│                           │  │  Router Go — 1 endpoint      │  │  │
│                           │  └──────────────────────────────┘  │  │
│                           │                                     │  │
│                           │  ┌──────────────────────────────┐  │  │
│                           │  │  Codeman Dashboard           │  │  │
│                           │  │  Puerto: 3000                │  │  │
│                           │  │  Ver arquitectos en tiempo   │  │  │
│                           │  │  real desde el navegador     │  │  │
│                           │  └──────────────────────────────┘  │  │
│                           └─────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  AUDITORES Y QUALITY GATE (capa transversal)                │  │
│  │  OpenClaw: supervisa plataforma 24/7                        │  │
│  │  Gemini Gate: valida planes (6 etiquetas: PLAN/TAREA/       │  │
│  │    MODELO/BORIS/VERIFICACION/EVIDENCIA/KB)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Flujo de una tarea (de principio a fin):**

```
Carlos dice: "necesito X"
      │
      ▼
SM crea plan (sm-protocol, 6 pasos)
      │
      ▼
Gemini valida plan (6 etiquetas OK?)
      │                    │
     OK                RECHAZADO
      │                    │
      ▼              SM corrige y
Carlos aprueba        reenvía
      │
      ▼
SM guarda plan en KB
      │
      ▼
SM notifica al arquitecto: "lee task-X en KB"
      │
      ▼
Arquitecto lee KB → ejecuta → verifica (Boris)
      │
      ▼
Arquitecto guarda resultado en KB
      │
      ▼
SM lee notificacion → reporta a Carlos
```

---

## 1.5 Componentes explicados

### Claude Desktop Chat (SM)
El "jefe de proyecto" del sistema. Corre en la PC del usuario. Tiene acceso al Knowledge Hub y al servidor via SSH. No programa. Su unico trabajo es coordinar: crear planes, enviar tareas, verificar que se completaron, reportar. Usa el skill `sm-protocol` para cada tarea.

### Claude Code CLI (Arquitectos)
Los "ejecutores senior" del sistema. Corren en el servidor en sesiones tmux separadas, una por proyecto. Reciben tareas del SM via KB, las analizan, crean equipos de sub-agentes para ejecutarlas, verifican con Boris, y notifican cuando terminan. Nunca escriben codigo directamente — delegan con `Task subagent_type="general-purpose"`.

### Knowledge Hub (KB)
La "memoria central" del sistema. Base de datos que todos los componentes pueden leer y escribir. Permite que el SM y los arquitectos se comuniquen de forma asincrona sin necesidad de que esten activos al mismo tiempo. Corre en el servidor en el puerto 18793 (SSE) y 18791 (API).

### Boris Hooks
El "control de calidad" del sistema. Conjunto de scripts instalados en cada proyecto que interceptan git commit y exigen evidencia real antes de permitirlo. Boris es la diferencia entre un agente que "cree que funciona" y uno que puede demostrarlo. Incluye 5 hooks: verification-gate, session-start, pre-compact, stop, protect-files.

### SypnoseProxy (CLIProxyAPI)
El "router de modelos" del sistema. Servidor Go en el puerto 8317 que expone 42+ modelos de 6 providers (Anthropic, Google, OpenAI, Qwen, DeepSeek, Mistral) bajo un unico endpoint compatible con la API de OpenAI. Los arquitectos lo usan para delegar tareas a modelos baratos o gratuitos.

### Cozempic
El "protector de contexto" del sistema. Herramienta Python con 13 estrategias de limpieza que evita la degradacion de rendimiento en sesiones largas. Se instala en cada proyecto y agrega hooks aditivos (no conflicta con Boris). Reduce el consumo de tokens en un 55% en sesiones prolongadas.

### Codeman Dashboard
El "panel de control" visual del sistema. Aplicacion web open source (puerto 3000) que muestra todas las sesiones tmux de Claude Code en tiempo real con terminal xterm.js, contador de tokens, y notificaciones. Reemplaza la necesidad de conectarse por SSH cada vez que quieres ver que estan haciendo los arquitectos.

### tmux-claude.sh
Script de conexion automatica. Cuando abres PowerShell en la carpeta de un proyecto, este script se conecta al servidor via SSH, busca la sesion tmux del proyecto, y te conecta directamente a ella. Si la sesion no existe, la crea y lanza Claude Code automaticamente.

---

---

# PARTE 2 — PREPARAR EL SERVIDOR NUEVO

Esta parte asume que tienes acceso a un servidor Linux nuevo (VPS o dedicado) sin nada instalado todavia. Seguiremos el ejemplo real del sistema de Carlos:

- **IP:** 217.216.48.91
- **Puerto SSH:** 2024
- **Usuario:** gestoria
- **OS:** Ubuntu 24.04 LTS

Todos los comandos de esta seccion se ejecutan en el servidor via SSH.

---

## 2.1 Requisitos minimos

Para que Sypnose corra bien necesitas un servidor con estas especificaciones:

| Recurso | Minimo | Recomendado | Por que |
|---------|--------|-------------|---------|
| CPU | 4 cores | 8 cores | Los agentes corren en paralelo — cada arquitecto usa CPU |
| RAM | 8 GB | 16 GB | Knowledge Hub + Claude Code + Docker consume ~4-6 GB en reposo |
| Disco | 100 GB SSD | 200 GB SSD | Imagenes Docker, logs, proyectos git, builds |
| OS | Ubuntu 22.04 | Ubuntu 24.04 LTS | Soporte a largo plazo, Docker moderno |
| Conexion | 100 Mbps | 1 Gbps | Los arquitectos hacen muchas llamadas a la API |

**Proveedor recomendado:** Contabo VPS (el que usa Carlos). 8 cores / 16 GB / 200 GB disco por ~$16/mes.

**Importante:** El servidor debe ser accesible por SSH. Si usas un VPS, el proveedor te da la IP y credenciales iniciales de root.

---

## 2.2 Seguridad — UFW, Fail2ban, SSH hardening

La seguridad va primero. Un servidor sin endurecer recibe ataques de fuerza bruta en minutos.

### Conectarse al servidor como root

```bash
ssh root@217.216.48.91
# Cambiar 217.216.48.91 por la IP de tu servidor
```

### Crear usuario no-root

Nunca trabajar como root. Crear un usuario dedicado:

```bash
# Crear usuario
adduser gestoria
# El sistema pregunta password y datos. Llenarlos.

# Dar permisos sudo
usermod -aG sudo gestoria

# Copiar SSH key al nuevo usuario (si ya tienes una en root)
mkdir -p /home/gestoria/.ssh
cp ~/.ssh/authorized_keys /home/gestoria/.ssh/
chown -R gestoria:gestoria /home/gestoria/.ssh
chmod 700 /home/gestoria/.ssh
chmod 600 /home/gestoria/.ssh/authorized_keys
```

**QUE PUEDE SALIR MAL:** Si no copias la SSH key antes de desactivar el login por password, puedes quedarte sin acceso. Siempre verifica que puedes entrar como el usuario nuevo antes de cerrar la sesion de root.

### Verificar acceso como usuario nuevo

Abre una terminal nueva (sin cerrar la de root) y prueba:

```bash
# Desde tu PC local, en terminal nueva
ssh -p 22 gestoria@217.216.48.91
# Si entras OK, continua. Si falla, vuelve a root y revisa.
```

### Configurar SSH hardening

```bash
# Editar configuracion SSH
sudo nano /etc/ssh/sshd_config
```

Cambiar o agregar estas lineas:

```
# Cambiar puerto (dificulta ataques automatizados)
Port 2024

# Desactivar login de root
PermitRootLogin no

# Solo autenticacion por clave SSH
PasswordAuthentication no
PubkeyAuthentication yes

# Sin forwarding X11 (innecesario para servidor)
X11Forwarding no

# Tiempo maximo de login
LoginGraceTime 30

# Maximo de intentos de autenticacion
MaxAuthTries 3
```

Guardar (Ctrl+O, Enter, Ctrl+X) y reiniciar SSH:

```bash
# Verificar que la configuracion no tiene errores ANTES de reiniciar
sudo sshd -t
# Si dice "sshd: no issues found" o no dice nada, continua

sudo systemctl restart ssh
```

**QUE PUEDE SALIR MAL:** Si `sshd -t` muestra errores, NO reinicies SSH. Corrije el error primero. Si reinicias con una configuracion rota, pierdes acceso al servidor. Siempre ten abierta la sesion SSH actual mientras haces este cambio — si algo sale mal, puedes revertir.

### Reconectarte con el nuevo puerto

A partir de ahora:

```bash
ssh -p 2024 gestoria@217.216.48.91
```

### Instalar y configurar UFW (firewall)

```bash
# Instalar UFW
sudo apt update
sudo apt install -y ufw

# Regla defecto: denegar todo lo que entra, permitir lo que sale
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir el puerto SSH nuevo
sudo ufw allow 2024/tcp

# Permitir HTTPS y HTTP (si vas a tener servicios web)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activar firewall
sudo ufw enable
# Pregunta: "Command may disrupt existing ssh connections. Proceed with operation (y|n)?"
# Escribe: y

# Verificar estado
sudo ufw status
```

Salida esperada:
```
Status: active

To                         Action      From
--                         ------      ----
2024/tcp                   ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

**QUE PUEDE SALIR MAL:** Si activas UFW sin haber agregado el puerto SSH, te quedas sin acceso. Siempre `ufw allow PUERTO_SSH` antes de `ufw enable`. Verifica que el puerto que agregas es el que configuraste en sshd_config.

### Instalar y configurar Fail2ban

Fail2ban bloquea IPs que intentan conectarse demasiadas veces (ataques de fuerza bruta):

```bash
# Instalar
sudo apt install -y fail2ban

# Crear configuracion local (no modificar el archivo .conf original)
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 2024
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

# Activar e iniciar
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Verificar estado
sudo fail2ban-client status sshd
```

---

## 2.3 Docker y Docker Compose

Docker es necesario para correr servicios de forma aislada (bases de datos, apps, etc.).

### Instalar Docker (metodo oficial)

```bash
# Desinstalar versiones viejas si existen
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Instalar dependencias
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# Agregar repositorio oficial de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar instalacion
docker --version
# Esperado: Docker version 25.x.x o superior

docker compose version
# Esperado: Docker Compose version v2.x.x
```

### Agregar usuario al grupo docker

Sin esto, necesitas `sudo` para cada comando Docker:

```bash
sudo usermod -aG docker gestoria

# Para que el cambio tome efecto sin reiniciar sesion:
newgrp docker

# Verificar
docker ps
# Debe funcionar sin sudo y mostrar tabla vacia (sin error)
```

**QUE PUEDE SALIR MAL:** Si `docker ps` da error de permiso, cierra la sesion SSH y vuelve a entrar. El grupo docker solo se aplica en sesiones nuevas.

### Iniciar Docker automaticamente al arrancar

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 2.4 Node.js via nvm

nvm (Node Version Manager) permite instalar y cambiar versiones de Node.js sin conflictos. Es lo correcto — `apt install nodejs` suele instalar versiones viejas.

### Instalar nvm

```bash
# Descargar e instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recargar el shell para que nvm este disponible
source ~/.bashrc

# Verificar
nvm --version
# Esperado: 0.39.7 o similar
```

### Instalar Node.js 22 (LTS recomendado para Sypnose)

```bash
nvm install 22
nvm use 22
nvm alias default 22

# Verificar
node --version
# Esperado: v22.x.x

npm --version
# Esperado: 10.x.x o superior
```

**QUE PUEDE SALIR MAL:** nvm modifica ~/.bashrc para inicializarse. Si usas zsh en lugar de bash, el comando debe agregarse a ~/.zshrc. Si `nvm` no se encuentra despues de reiniciar sesion, verifica que estas lineas estan al final de ~/.bashrc (o ~/.zshrc):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

---

## 2.5 Python 3.11+, Git, tmux y herramientas base

### Instalar paquetes del sistema

```bash
sudo apt update
sudo apt install -y \
  git \
  tmux \
  python3 \
  python3-pip \
  python3-venv \
  curl \
  wget \
  jq \
  htop \
  unzip \
  build-essential

# Verificar versiones
git --version
# Esperado: git version 2.x.x

tmux -V
# Esperado: tmux 3.x

python3 --version
# Esperado: Python 3.10 o superior (Ubuntu 24.04 trae 3.12)
```

### Instalar Python 3.11 si la version es inferior a 3.11

Ubuntu 22.04 trae Python 3.10. Si necesitas 3.11+:

```bash
# Agregar repositorio deadsnakes
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Verificar
python3.11 --version
# Esperado: Python 3.11.x
```

### Configurar Git (indispensable)

```bash
git config --global user.name "Carlos De La Torre"
git config --global user.email "radelqui@gmail.com"
git config --global init.defaultBranch main
git config --global core.autocrlf false

# Verificar
git config --list | grep user
```

### Crear directorio de scripts

```bash
mkdir -p ~/scripts
```

---

## 2.6 Configurar SWAP

Si el servidor tiene menos de 8 GB de RAM, o si quieres un colchon de seguridad, el SWAP evita que el sistema se cuelgue cuando la memoria se llena.

```bash
# Verificar si ya hay SWAP
free -h
# Si la linea "Swap" muestra 0B, no hay SWAP

# Crear archivo de SWAP de 4 GB
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Hacer SWAP permanente (sobrevive reboot)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Ajustar swappiness (cuanto usa el kernel el SWAP)
# 10 = solo usa SWAP cuando RAM esta al 90%
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verificar
free -h
# La linea Swap debe mostrar 4.0G
```

**QUE PUEDE SALIR MAL:** `fallocate` falla en algunos sistemas de archivos. Si da error, usar `dd` en su lugar:

```bash
sudo dd if=/dev/zero of=/swapfile bs=1G count=4
```

---

## 2.7 Verificacion final del servidor

Antes de continuar a la Parte 3, verifica que todo esta listo:

```bash
# Script de verificacion rapida
echo "=== NODE ==="
node --version

echo "=== NPM ==="
npm --version

echo "=== PYTHON ==="
python3 --version

echo "=== GIT ==="
git --version

echo "=== TMUX ==="
tmux -V

echo "=== DOCKER ==="
docker --version
docker compose version

echo "=== FIREWALL ==="
sudo ufw status | head -5

echo "=== FAIL2BAN ==="
sudo fail2ban-client status | head -3

echo "=== SWAP ==="
free -h | grep Swap

echo "=== DISCO ==="
df -h / | tail -1

echo "=== RAM ==="
free -h | grep Mem
```

Salida esperada (los numeros de version pueden variar):
```
=== NODE ===
v22.12.0
=== NPM ===
10.9.0
=== PYTHON ===
Python 3.12.3
=== GIT ===
git version 2.43.0
=== TMUX ===
tmux 3.4
=== DOCKER ===
Docker version 26.1.4, build 5650f9b
Docker Compose version v2.27.1
=== FIREWALL ===
Status: active
...
=== SWAP ===
Swap:          4.0Gi       0B       4.0Gi
```

Si todo muestra los valores correctos, el servidor esta listo para la Parte 3.

---

---

# PARTE 3 — INSTALAR CLAUDE CODE

Esta seccion configura Claude Code CLI en el servidor. Claude Code es el motor que hace funcionar a los arquitectos de Sypnose.

Todos los comandos se ejecutan en el servidor como el usuario `gestoria` (o el usuario que creaste en la Parte 2).

---

## 3.1 Instalacion npm

```bash
# Instalar Claude Code globalmente
npm install -g @anthropic-ai/claude-code

# Verificar instalacion
claude --version
```

Salida esperada:
```
@anthropic-ai/claude-code@2.1.52
```

**QUE PUEDE SALIR MAL:**

- **Error de permisos npm:** Si npm da `EACCES permission denied`, es porque npm esta instalado como root. Con nvm (como hicimos en la Parte 2) esto no deberia pasar. Si sucede, verifica que nvm esta activo: `which node` debe mostrar `/home/gestoria/.nvm/versions/...`, no `/usr/local/bin/node`.

- **comando `claude` no encontrado despues de instalar:** Cierra y vuelve a abrir la sesion SSH. O ejecuta `source ~/.bashrc`.

- **Error de red durante instalacion:** Verifica conexion del servidor: `curl -s https://registry.npmjs.org/ | head -5`. Si no responde, puede haber un problema de DNS: `echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf`.

---

## 3.2 Version recomendada y bloqueo de auto-update

### Version recomendada para Sypnose

La version estable para el servidor de Carlos es la **v2.1.52**.

Las versiones v2.1.72 y v2.1.73 tienen un memory leak critico (30 GB/hora de RAM) que tumba el servidor. No actualizar a esas versiones.

Para instalar una version especifica:

```bash
npm install -g @anthropic-ai/claude-code@2.1.52
```

### Bloquear el auto-update

Claude Code se actualiza automaticamente a la ultima version si no se lo impides. En el servidor de Sypnose esto es peligroso porque una version nueva puede tener regresiones.

Agregar la variable de entorno al `.bashrc` del usuario del servidor:

```bash
# Abrir .bashrc
nano ~/.bashrc

# Agregar al final (antes del bloque de nvm si existe):
export CLAUDE_CODE_DISABLE_AUTOUPDATE=1
```

Guardar y aplicar:

```bash
source ~/.bashrc

# Verificar
echo $CLAUDE_CODE_DISABLE_AUTOUPDATE
# Debe mostrar: 1
```

**QUE PUEDE SALIR MAL:** La variable debe estar en `.bashrc` antes del bloque de nvm. Si la pones despues del guard `case $- in *i*)` que protege shells no-interactivas, no se exportara en sesiones SSH no-interactivas. Para sesiones de tmux que llaman a Claude directamente, es mas seguro exportarla de forma inline en el script de lanzamiento:

```bash
# En tmux-claude.sh o equivalente:
CLAUDE_CODE_DISABLE_AUTOUPDATE=1 claude --continue
```

---

## 3.3 Configurar API key

Claude Code necesita una API key de Anthropic para funcionar. Esta key se usa para autenticar las llamadas a la API de Claude.

### Opcion A: Login interactivo (recomendado para primera vez)

```bash
claude
# Claude Code arranca y pide autenticacion
# Seguir las instrucciones en pantalla
# Presionar Ctrl+C cuando termine el proceso de login
```

### Opcion B: Variable de entorno (recomendado para automatizacion)

Si tienes la API key directamente:

```bash
# Agregar al .bashrc
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
source ~/.bashrc
```

Reemplaza `sk-ant-...` con tu API key real. Obtenla en https://console.anthropic.com/

### Verificar autenticacion

```bash
# Verificar que Claude Code puede conectarse
claude --version
# No debe dar error de autenticacion
```

**QUE PUEDE SALIR MAL:**

- **"Invalid API key":** La key esta mal copiada. Verifica que no tiene espacios extra ni saltos de linea.
- **"API key expired":** Genera una nueva key en console.anthropic.com
- **"Rate limit":** Tu cuenta tiene limites de uso. Verifica en el dashboard de Anthropic.

---

## 3.4 Settings global estandar Sypnose

El archivo de settings global de Claude Code define los permisos que tiene el agente para ejecutar herramientas sin pedir confirmacion. Sin esto, el arquitecto pregunta "¿ejecuto?" en cada paso y nadie responde.

### Crear el directorio de settings global

```bash
mkdir -p ~/.claude
```

### Crear el settings.json global estandar Sypnose

```bash
cat > ~/.claude/settings.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(npm *)",
      "Bash(node *)",
      "Bash(git *)",
      "Bash(cargo *)",
      "Bash(python *)",
      "Bash(python3 *)",
      "Bash(pytest *)",
      "Bash(pip *)",
      "Bash(pip3 *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(ls *)",
      "Bash(cat *)",
      "Bash(mkdir *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(chmod *)",
      "Bash(chown *)",
      "Bash(echo *)",
      "Bash(grep *)",
      "Bash(find *)",
      "Bash(sed *)",
      "Bash(awk *)",
      "Bash(jq *)",
      "Bash(docker *)",
      "Bash(systemctl *)",
      "Bash(journalctl *)",
      "Bash(tmux *)",
      "Bash(ssh *)",
      "Bash(scp *)",
      "Bash(source *)",
      "Bash(export *)",
      "Bash(which *)",
      "Bash(whoami)",
      "Bash(pwd)",
      "Bash(date)",
      "Bash(uptime)",
      "Bash(free *)",
      "Bash(df *)",
      "Bash(ps *)",
      "Bash(kill *)",
      "Bash(tail *)",
      "Bash(head *)",
      "Bash(wc *)",
      "Bash(sort *)",
      "Bash(uniq *)",
      "Bash(tee *)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "MultiEdit",
      "mcp__boris__*",
      "mcp__knowledge-hub__*"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf /*)",
      "Bash(git push --force origin main)",
      "Bash(git push --force origin master)",
      "Bash(DROP TABLE *)",
      "Bash(DROP DATABASE *)"
    ]
  },
  "experimental": {
    "agentTeams": true
  }
}
EOF
```

### Que hace cada seccion

**allow:** Lista de herramientas y comandos que el arquitecto puede ejecutar sin pedir permiso. Si un comando no esta aqui, Claude Code pide confirmacion antes de ejecutarlo.

**deny:** Lista de operaciones destructivas que NUNCA se permiten, sin importar que. Protege contra errores catasfoficos.

**experimental.agentTeams:** Habilita Agent Teams — la capacidad de lanzar equipos de sub-agentes que trabajan en paralelo.

**QUE PUEDE SALIR MAL:**

- **El agente sigue pidiendo permisos para comandos de la lista:** Verifica que el archivo esta en `~/.claude/settings.json` (con punto al inicio) y tiene JSON valido. Prueba: `cat ~/.claude/settings.json | python3 -m json.tool`. Si da error, hay un problema de sintaxis JSON.

- **El agente ejecuta algo destructivo que no esta en deny:** Agrega la operacion especifica al array deny.

---

## 3.5 Flag --dangerously-skip-permissions

Este flag hace que Claude Code ignore TODAS las confirmaciones de permisos y ejecute cualquier herramienta directamente. Es la alternativa bruta al settings.json del paso anterior.

**Cuando usarlo:**
- Durante el setup inicial cuando todavia no sabes que permisos necesitas
- En entornos completamente controlados donde el riesgo es minimo
- Cuando el settings.json no es suficiente para alguna herramienta especifica

**Cuando NO usarlo:**
- En ramas de produccion
- Cuando el arquitecto tiene acceso a datos sensibles
- Como solucion permanente (usa settings.json en su lugar)

### Uso

```bash
claude --dangerously-skip-permissions
```

O al arrancar una sesion tmux:

```bash
tmux new-session -d -s mi-proyecto -c /home/gestoria/mi-proyecto
tmux send-keys -t mi-proyecto "claude --dangerously-skip-permissions --continue" Enter
```

**Alternativa mas segura: Auto Mode**

Claude Code v2.1.52+ tiene un modo que es mejor que `--dangerously-skip-permissions`:

```bash
claude --permission-mode auto --continue
```

Auto Mode funciona asi:
- Operaciones seguras (write, edit, bash normal) → automatico sin preguntar
- Operaciones peligrosas (rm -rf, drop, force push) → bloqueado

Es mas inteligente que skip-permissions porque todavia protege contra los peores casos.

Si ya tienes una sesion corriendo y quieres activar Auto Mode sin reiniciar, dentro de la sesion de Claude presiona **Shift+Tab** — esto activa el modo automatico en la sesion actual.

---

## 3.6 Alias en .bashrc

Estos alias hacen mas comodo trabajar con Claude Code en el dia a dia:

```bash
# Abrir .bashrc
nano ~/.bashrc
```

Agregar al final:

```bash
# =====================================================
# SYPNOSE — Alias de Claude Code
# =====================================================

# Bloquear auto-update (critico — ver nota en v3.2)
export CLAUDE_CODE_DISABLE_AUTOUPDATE=1

# Alias: claude con auto mode (lo mas comun)
alias ca='claude --permission-mode auto --continue'

# Alias: claude en modo interactivo normal
alias cc='claude --continue'

# Alias: ver version instalada
alias cv='claude --version'

# Alias: conectar a sesion tmux de un proyecto
# Uso: ctmux nombre-proyecto /ruta/al/proyecto
ctmux() {
  local SESSION="$1"
  local DIR="$2"
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux attach -t "$SESSION"
  else
    tmux new-session -d -s "$SESSION" -c "$DIR"
    sleep 1
    tmux send-keys -t "$SESSION" "CLAUDE_CODE_DISABLE_AUTOUPDATE=1 claude --permission-mode auto --continue" Enter
    tmux attach -t "$SESSION"
  fi
}

# Alias: ver todas las sesiones tmux activas
alias tls='tmux list-sessions'

# Alias: ver logs de la sesion actual (util para debugging)
alias tlogs='tmux capture-pane -p -t'
```

Aplicar cambios:

```bash
source ~/.bashrc
```

### Script tmux-claude.sh (para el SM y PowerShell)

El SM necesita un script estandarizado para arrancar sesiones de arquitecto. Crear este script en `~/scripts/`:

```bash
cat > ~/scripts/tmux-claude.sh << 'SCRIPT'
#!/bin/bash
# Uso: ~/scripts/tmux-claude.sh NOMBRE_SESION DIRECTORIO
# Ejemplo: ~/scripts/tmux-claude.sh gestoriard /home/gestoria/gestoriard

SESSION="$1"
DIR="$2"

if /usr/bin/tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "Sesion '$SESSION' ya existe — conectando..."
    /usr/bin/tmux attach -t "$SESSION"
else
    echo "Creando sesion '$SESSION' en $DIR..."
    /usr/bin/tmux new-session -d -s "$SESSION" -c "$DIR"
    sleep 1
    /usr/bin/tmux send-keys -t "$SESSION" \
      "CLAUDE_CODE_DISABLE_AUTOUPDATE=1 claude --permission-mode auto --continue" Enter
    /usr/bin/tmux attach -t "$SESSION"
fi
SCRIPT

chmod +x ~/scripts/tmux-claude.sh
```

**Nota importante:** El script usa `/usr/bin/tmux` (ruta absoluta), no solo `tmux`. Esto es porque si en el futuro se instala un wrapper `sm-tmux` que intercepta comandos tmux, la ruta absoluta va directo al binario real y los arquitectos arrancan sin problemas.

---

## 3.7 Verificacion final de Claude Code

Antes de continuar con la instalacion de Sypnose, verifica que Claude Code esta correctamente configurado:

### Test 1: Claude Code arranca y tiene la version correcta

```bash
claude --version
# Esperado: @anthropic-ai/claude-code@2.1.52
```

### Test 2: El auto-update esta bloqueado

```bash
echo $CLAUDE_CODE_DISABLE_AUTOUPDATE
# Esperado: 1
```

### Test 3: El settings.json global es JSON valido

```bash
python3 -m json.tool ~/.claude/settings.json > /dev/null && echo "JSON valido" || echo "ERROR en JSON"
# Esperado: JSON valido
```

### Test 4: El script tmux-claude.sh existe y es ejecutable

```bash
ls -la ~/scripts/tmux-claude.sh
# Esperado: -rwxr-xr-x ... /home/gestoria/scripts/tmux-claude.sh
```

### Test 5: Claude Code puede crear una sesion y ejecutar comandos

```bash
# Crear sesion de prueba
tmux new-session -d -s test-sypnose -c /home/gestoria

# Enviar un comando simple
tmux send-keys -t test-sypnose "echo 'Sypnose listo'" Enter

# Ver el output
sleep 2
tmux capture-pane -p -t test-sypnose | tail -5

# Limpiar la sesion de prueba
tmux kill-session -t test-sypnose
```

### Test 6: Los alias funcionan

```bash
# Recargar bashrc si no lo has hecho
source ~/.bashrc

# Verificar alias
which ca
# Esperado: ca: aliased to claude --permission-mode auto --continue

tls
# Si no hay sesiones: "no server running on /tmp/tmux-..."
# Si hay sesiones: lista de sesiones activas
```

### Resumen del estado despues de la Parte 3

Si todos los tests pasan, tienes:

- Claude Code v2.1.52 instalado y bloqueado contra auto-updates
- API key configurada y funcionando
- Settings global con permisos Sypnose (allow list + deny list)
- Script tmux-claude.sh listo para que el SM arranque arquitectos
- Alias de conveniencia en .bashrc

El servidor esta listo para los siguientes pasos:
- **Parte 4:** Instalar Knowledge Hub (memoria del sistema)
- **Parte 5:** Instalar Boris hooks en cada proyecto (control de calidad)
- **Parte 6:** Configurar el SM en la PC del usuario (Desktop Chat)

---

*Sypnose Manual v1.0 — Partes 1-3*
*Basado en: sypnose-install-guide.md (v26-Mar-2026), Boris v6.2 README*
*Sistema de referencia: Contabo VPS 217.216.48.91, usuario gestoria, puerto 2024*


---

# SYPNOSE — Manual de Instalacion
## Partes 4, 5 y 6

---

## TABLA DE CONTENIDOS

- [PARTE 4: Configurar Claude Desktop (Windows/Mac)](#parte-4-configurar-claude-desktop-windowsmac)
  - [4.1 Instalar Claude Desktop](#41-instalar-claude-desktop)
  - [4.2 Donde esta claude_desktop_config.json](#42-donde-esta-claude_desktop_configjson)
  - [4.3 MCPs a configurar](#43-mcps-a-configurar)
  - [4.4 MCP Knowledge Hub (via tunel SSH)](#44-mcp-knowledge-hub-via-tunel-ssh)
  - [4.5 MCP Boris](#45-mcp-boris)
  - [4.6 MCP Playwright](#46-mcp-playwright)
  - [4.7 Skills a instalar](#47-skills-a-instalar)
  - [4.8 Settings del proyecto local](#48-settings-del-proyecto-local)
  - [4.9 Configuracion completa — ejemplo real del sistema de Carlos](#49-configuracion-completa--ejemplo-real-del-sistema-de-carlos)
  - [4.10 Verificacion final](#410-verificacion-final)

- [PARTE 5: Configurar Claude Code Chat Web](#parte-5-configurar-claude-code-chat-web)
  - [5.1 Que es Claude Code Chat Web](#51-que-es-claude-code-chat-web)
  - [5.2 Diferencias con Desktop](#52-diferencias-con-desktop)
  - [5.3 Configurar MCPs en Claude Code CLI](#53-configurar-mcps-en-claude-code-cli)
  - [5.4 Instalar Skills](#54-instalar-skills)
  - [5.5 Settings del proyecto (.claude/settings.local.json)](#55-settings-del-proyecto-claudesettingslocationjson)
  - [5.6 Configurar auto mode (sin pedir permisos)](#56-configurar-auto-mode-sin-pedir-permisos)
  - [5.7 Limitaciones conocidas](#57-limitaciones-conocidas)

- [PARTE 6: Instalar Knowledge Hub (Bus de Comunicacion)](#parte-6-instalar-knowledge-hub-bus-de-comunicacion)
  - [6.1 Que es Knowledge Hub](#61-que-es-knowledge-hub)
  - [6.2 Arquitectura del sistema](#62-arquitectura-del-sistema)
  - [6.3 Instalacion en el servidor](#63-instalacion-en-el-servidor)
  - [6.4 Configurar systemd (arranque automatico)](#64-configurar-systemd-arranque-automatico)
  - [6.5 Verificar que KB funciona](#65-verificar-que-kb-funciona)
  - [6.6 Endpoints disponibles](#66-endpoints-disponibles)
  - [6.7 Herramientas MCP del KB](#67-herramientas-mcp-del-kb)
  - [6.8 Protocolo de comunicacion SM y arquitectos](#68-protocolo-de-comunicacion-sm-y-arquitectos)
  - [6.9 Bus de tareas — formato estandar](#69-bus-de-tareas--formato-estandar)
  - [6.10 Ejemplo de flujo completo de una tarea](#610-ejemplo-de-flujo-completo-de-una-tarea)
  - [6.11 Que puede salir mal](#611-que-puede-salir-mal)

---

---

# PARTE 4: Configurar Claude Desktop (Windows/Mac)

Claude Desktop es el **Service Manager (SM)** de SYPNOSE. No programa. No hace commits.
Su trabajo es coordinar: crear planes, enviar tareas a arquitectos via KB, verificar resultados.

---

## 4.1 Instalar Claude Desktop

### Windows

1. Ir a https://claude.ai/download
2. Descargar el instalador `.exe`
3. Ejecutar como administrador
4. Al terminar, abrir Claude Desktop
5. Iniciar sesion con tu cuenta Anthropic (necesitas plan Pro o Max)

### Mac

1. Ir a https://claude.ai/download
2. Descargar el `.dmg`
3. Arrastrar Claude a la carpeta Aplicaciones
4. Abrir Claude desde Aplicaciones
5. Iniciar sesion con tu cuenta Anthropic

### Verificar version

Una vez abierto, en el menu de Claude Desktop (icono en bandeja / menubar):
- Settings → About → debe mostrar una version reciente

---

## 4.2 Donde esta claude_desktop_config.json

Este archivo controla los MCPs que Desktop carga al arrancar.

| Sistema | Ruta |
|---|---|
| Windows | `C:\Users\TU_USUARIO\AppData\Roaming\Claude\claude_desktop_config.json` |
| Mac | `~/Library/Application Support/Claude/claude_desktop_config.json` |

### Como abrirlo

**Windows:**
```
Win + R → escribe: %APPDATA%\Claude → Enter → abrir claude_desktop_config.json con Notepad
```

O desde PowerShell:
```powershell
notepad "$env:APPDATA\Claude\claude_desktop_config.json"
```

**Mac:**
```bash
open ~/Library/Application\ Support/Claude/
# Luego abrir claude_desktop_config.json con cualquier editor
```

### Si el archivo no existe

Crearlo vacio con este contenido minimo:
```json
{
  "mcpServers": {}
}
```

---

## 4.3 MCPs a configurar

Desktop Chat necesita 3 MCPs para funcionar como SM:

| MCP | Para que sirve | Obligatorio |
|---|---|---|
| `sypnose-tunnels` | Abre tuneles SSH automaticos al servidor | SI |
| `knowledge-hub` | Conecta al KB via tunel SSE | SI |
| `boris` | Herramientas de verificacion y estado | SI en servidor local |
| `playwright` | Control del navegador Chrome | Opcional (solo si SM navega web) |

El orden importa: `sypnose-tunnels` debe cargarse primero porque los otros dependen de los tuneles.

---

## 4.4 MCP Knowledge Hub (via tunel SSH)

El Knowledge Hub vive en el servidor. Desktop lo accede via tunel SSH.

### Paso 1: Instalar sypnose-tunnels MCP

Este MCP abre los tuneles automaticamente cuando Desktop arranca.

```powershell
# Windows — crear directorio para MCPs locales
mkdir -p "C:\Users\TU_USUARIO\.claude\mcp-servers\sypnose-tunnels"
cd "C:\Users\TU_USUARIO\.claude\mcp-servers\sypnose-tunnels"
```

```bash
# Mac/Linux
mkdir -p ~/.claude/mcp-servers/sypnose-tunnels
cd ~/.claude/mcp-servers/sypnose-tunnels
```

Crear `package.json`:
```json
{
  "name": "sypnose-tunnels",
  "version": "1.1.0",
  "description": "MCP server — SSH tunnels automaticos para Sypnose",
  "type": "module",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ssh2": "^1.16.0"
  }
}
```

Crear `index.js` (copia exacta, no modificar estructura):
```javascript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import net from 'net';

const SSH_HOST = process.env.SSH_HOST || '127.0.0.1';
const SSH_PORT = parseInt(process.env.SSH_PORT || '22');
const SSH_USER = process.env.SSH_USER || 'root';
const SSH_KEY_PATH = process.env.SSH_KEY_PATH || `${process.env.HOME || process.env.USERPROFILE}/.ssh/id_rsa`;

// Puertos a tunelizar: local (tu PC) → remote (servidor)
const TUNNEL_PORTS = [
  { local: 3000,  remote: 3000,  name: 'codeman' },
  { local: 3002,  remote: 3002,  name: 'sypnose-agent' },
  { local: 18793, remote: 18793, name: 'kb-sse' },
  { local: 8317,  remote: 8317,  name: 'cliproxyapi' },
  { local: 18791, remote: 18791, name: 'knowledge-hub' },
];

const tunnelState = {};
const tunnelHandles = {};
let sshConn = null;

TUNNEL_PORTS.forEach(t => {
  tunnelState[t.name] = { port: t.local, connected: false, error: null };
});

function log(msg) { process.stderr.write(`[sypnose-tunnels] ${msg}\n`); }

let privateKey;
try { privateKey = readFileSync(SSH_KEY_PATH); }
catch (e) { log(`Cannot read SSH key ${SSH_KEY_PATH}: ${e.message}`); }

function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => { log(`SSH connected to ${SSH_HOST}:${SSH_PORT}`); resolve(conn); });
    conn.on('error', (err) => { log(`SSH error: ${err.message}`); reject(err); });
    conn.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, privateKey,
      readyTimeout: 15000, keepaliveInterval: 30000 });
  });
}

function createLocalForward(conn, localPort, remotePort, name) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer((socket) => {
      conn.forwardOut('127.0.0.1', localPort, '127.0.0.1', remotePort, (err, stream) => {
        if (err) { log(`Forward error ${name}: ${err.message}`); socket.end(); return; }
        socket.pipe(stream).pipe(socket);
        stream.on('error', () => socket.destroy());
        socket.on('error', () => stream.destroy());
      });
    });
    srv.on('error', (err) => {
      tunnelState[name].connected = false; tunnelState[name].error = err.message; reject(err);
    });
    srv.listen(localPort, '127.0.0.1', () => {
      log(`Tunnel ${name}: localhost:${localPort} -> ${SSH_HOST}:${remotePort}`);
      tunnelState[name].connected = true; tunnelState[name].error = null;
      tunnelHandles[name] = srv; resolve(srv);
    });
  });
}

async function openAllTunnels() {
  if (!privateKey) { log('No SSH key — cannot open tunnels'); return; }
  try {
    if (sshConn) { try { sshConn.end(); } catch (e) {} }
    sshConn = await connectSSH();
    sshConn.on('error', (err) => {
      TUNNEL_PORTS.forEach(t => { tunnelState[t.name].connected = false; tunnelState[t.name].error = 'SSH connection lost'; });
    });
    sshConn.on('close', () => {
      TUNNEL_PORTS.forEach(t => { tunnelState[t.name].connected = false; });
    });
    const results = await Promise.allSettled(
      TUNNEL_PORTS.map(t => createLocalForward(sshConn, t.local, t.remote, t.name))
    );
    log(`${results.filter(r => r.status === 'fulfilled').length}/${TUNNEL_PORTS.length} tunnels open`);
  } catch (e) {
    log(`SSH connect failed: ${e.message}`);
    TUNNEL_PORTS.forEach(t => { tunnelState[t.name].error = `SSH: ${e.message}`; });
  }
}

async function closeAllTunnels() {
  for (const [name, srv] of Object.entries(tunnelHandles)) {
    try { srv.close(); } catch (e) {}
    tunnelState[name].connected = false; delete tunnelHandles[name];
  }
  if (sshConn) { try { sshConn.end(); } catch (e) {} sshConn = null; }
}

const mcpServer = new Server(
  { name: 'sypnose-tunnels', version: '1.1.0' },
  { capabilities: { tools: {} } }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'tunnel_status', description: 'Ver estado de los tuneles SSH', inputSchema: { type: 'object', properties: {} } },
    { name: 'tunnel_reconnect', description: 'Cerrar y reabrir todos los tuneles SSH', inputSchema: { type: 'object', properties: {} } },
  ],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'tunnel_status') {
    return { content: [{ type: 'text', text: JSON.stringify({ tunnels: tunnelState, ssh_host: SSH_HOST }, null, 2) }] };
  }
  if (request.params.name === 'tunnel_reconnect') {
    await closeAllTunnels(); await openAllTunnels();
    const connected = Object.values(tunnelState).filter(s => s.connected).length;
    return { content: [{ type: 'text', text: `Reconectado ${connected}/${TUNNEL_PORTS.length} tuneles\n${JSON.stringify(tunnelState, null, 2)}` }] };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

process.on('SIGTERM', async () => { await closeAllTunnels(); process.exit(0); });
process.on('SIGINT', async () => { await closeAllTunnels(); process.exit(0); });
await openAllTunnels();
const transport = new StdioServerTransport();
await mcpServer.connect(transport);
```

Instalar dependencias:
```bash
npm install
```

### Paso 2: Agregar sypnose-tunnels a claude_desktop_config.json

```json
"sypnose-tunnels": {
  "command": "node",
  "args": ["C:/Users/TU_USUARIO/.claude/mcp-servers/sypnose-tunnels/index.js"],
  "env": {
    "SSH_HOST": "IP_DEL_SERVIDOR",
    "SSH_PORT": "PUERTO_SSH",
    "SSH_USER": "USUARIO_SERVIDOR",
    "SSH_KEY_PATH": "C:/Users/TU_USUARIO/.ssh/id_rsa"
  }
}
```

### Paso 3: Agregar knowledge-hub a claude_desktop_config.json

Una vez que sypnose-tunnels esta activo, el KB es accesible en localhost:18793.
Agregar este bloque:

```json
"knowledge-hub": {
  "command": "npx",
  "args": ["-y", "supergateway", "--sse", "http://localhost:18793/sse"]
}
```

`supergateway` convierte el stream SSE del KB en protocolo MCP que Desktop entiende.
Necesita Node.js instalado en la PC.

---

## 4.5 MCP Boris

Boris da herramientas de verificacion y memoria: `boris_verify`, `boris_save_state`,
`boris_get_state`, `boris_start_task`, `boris_register_done`.

### Si Boris corre en la PC local

Boris es un script Python. Instalarlo en la PC:

```powershell
# Windows — crear directorio Boris
mkdir -p "C:\Users\TU_USUARIO\.boris"

# Descargar boris_spy.py (pedirlo al equipo o copiar del servidor)
# Luego agregar al claude_desktop_config.json:
```

```json
"boris": {
  "command": "python",
  "args": ["-u", "C:/Users/TU_USUARIO/.boris/boris_spy.py"],
  "env": {
    "PYTHONIOENCODING": "utf-8",
    "PYTHONUNBUFFERED": "1"
  }
}
```

### Si Boris corre en el servidor (acceso via SSH)

Si ya tienes el MCP SSH configurado, Boris puede ejecutarse en el servidor:
```json
"boris": {
  "command": "ssh",
  "args": [
    "-T", "-p", "PUERTO_SSH", "-o", "StrictHostKeyChecking=no",
    "USUARIO@IP_SERVIDOR",
    "python3 -u /home/USUARIO/.boris/boris_spy.py"
  ]
}
```

---

## 4.6 MCP Playwright

Playwright permite a Desktop controlar el navegador Chrome (para LinkedIn, portales web, etc.).

### Requisito previo

Chrome debe estar abierto con el puerto de debugging CDP activo.

En Windows, crear un archivo `.bat` para abrir Chrome con debugging:
```batch
@echo off
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\Users\TU_USUARIO\chrome-debug-profile"
```

Guardar como `abrir-chrome.bat` y ejecutar ANTES de usar Playwright.

### Agregar al config

```json
"playwright": {
  "command": "npx",
  "args": [
    "@playwright/mcp",
    "--cdp-endpoint",
    "http://localhost:9222"
  ]
}
```

**IMPORTANTE:** Si `npx` no esta disponible en la ruta del sistema, usar la ruta completa:
```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp", "--cdp-endpoint", "http://localhost:9222"]
}
```

**ADVERTENCIA:** Usa siempre `npx` (no rutas Linux como `/usr/bin/node`). En Windows
las rutas Linux no existen y el MCP falla silenciosamente.

---

## 4.7 Skills a instalar

Los skills son archivos Markdown que Claude Desktop carga como instrucciones de comandos.

### Donde van los skills

```
Windows: C:\Users\TU_USUARIO\.claude\skills\
Mac:     ~/.claude/skills/
```

### Skills obligatorios para el SM

| Skill | Archivo | Para que |
|---|---|---|
| `sm-protocol` | sm-protocol.md | Protocolo de 6 pasos para enviar tareas a arquitectos |
| `boris-workflow` | boris-workflow.md | Flujo de desarrollo Boris v6 |
| `sypnose-create-plan` | sypnose-create-plan.md | Crear planes estructurados |

### Instalar skills (Mac/Linux)

```bash
# Crear directorio
mkdir -p ~/.claude/skills

# Descargar del repositorio Sypnose
curl -o ~/.claude/skills/sm-protocol.md \
  https://raw.githubusercontent.com/radelqui/sypnose/main/skills/sm-protocol.md

curl -o ~/.claude/skills/boris-workflow.md \
  https://raw.githubusercontent.com/radelqui/sypnose/main/skills/boris-workflow.md

curl -o ~/.claude/skills/sypnose-create-plan.md \
  https://raw.githubusercontent.com/radelqui/sypnose/main/skills/sypnose-create-plan.md
```

### Instalar skills (Windows — PowerShell)

```powershell
# Crear directorio
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills"

# Descargar skills
$base = "https://raw.githubusercontent.com/radelqui/sypnose/main/skills"
$dest = "$env:USERPROFILE\.claude\skills"

Invoke-WebRequest "$base/sm-protocol.md" -OutFile "$dest\sm-protocol.md"
Invoke-WebRequest "$base/boris-workflow.md" -OutFile "$dest\boris-workflow.md"
Invoke-WebRequest "$base/sypnose-create-plan.md" -OutFile "$dest\sypnose-create-plan.md"
```

### Verificar que los skills cargan

En Desktop Chat escribir `/sm-protocol`. Si el skill esta instalado correctamente,
Desktop mostrara el flujo de 6 pasos. Si dice "skill no encontrado", verificar la ruta.

---

## 4.8 Settings del proyecto local

Claude Code en la PC local (no el servidor) tambien necesita un `settings.local.json`
en la carpeta del proyecto para controlar permisos y MCPs activos.

**Ruta:** `TU_PROYECTO\.claude\settings.local.json`

Este archivo no se sube a git (agregar `.claude/settings.local.json` al `.gitignore`).

Contenido recomendado:
```json
{
  "permissions": {
    "allow": [
      "mcp__knowledge-hub__kb_search",
      "mcp__knowledge-hub__kb_context",
      "mcp__knowledge-hub__kb_list",
      "mcp__knowledge-hub__kb_read",
      "mcp__knowledge-hub__kb_save",
      "mcp__knowledge-hub__kb_inbox_check",
      "mcp__boris__boris_get_state",
      "mcp__boris__boris_start_task",
      "mcp__boris__boris_register_done",
      "mcp__boris__boris_save_state",
      "mcp__boris__boris_health",
      "mcp__boris__boris_verify",
      "mcp__playwright__*",
      "WebSearch",
      "Bash(ssh:*)"
    ]
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["knowledge-hub"],
  "dangerouslySkipPermissions": true
}
```

---

## 4.9 Configuracion completa — ejemplo real del sistema de Carlos

Este es el `claude_desktop_config.json` real activo en el sistema de Carlos.
Contiene todos los MCPs del SM.

**Ruta en Windows:** `C:\Users\carlo\AppData\Roaming\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sypnose-tunnels": {
      "command": "node",
      "args": ["C:/Users/carlo/.claude/mcp-servers/sypnose-tunnels/index.js"],
      "env": {
        "SSH_HOST": "217.216.48.91",
        "SSH_PORT": "2024",
        "SSH_USER": "gestoria",
        "SSH_KEY_PATH": "C:/Users/carlo/.ssh/id_rsa"
      }
    },
    "knowledge-hub": {
      "command": "npx",
      "args": ["-y", "supergateway", "--sse", "http://localhost:18793/sse"]
    },
    "boris": {
      "command": "python",
      "args": ["-u", "C:/Users/carlo/.boris/boris_spy.py"],
      "env": {
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUNBUFFERED": "1"
      }
    }
  },
  "preferences": {
    "coworkWebSearchEnabled": true,
    "keepAwakeEnabled": true
  }
}
```

El `.mcp.json` del proyecto `C:\Carlos` (MCPs adicionales por proyecto):
```json
{
  "mcpServers": {
    "boris": {
      "command": "python",
      "args": ["-u", "C:/Users/carlo/.boris/boris_spy.py"],
      "env": {
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUNBUFFERED": "1"
      }
    },
    "knowledge-hub": {
      "command": "ssh",
      "args": [
        "-T", "-p", "2024",
        "-o", "StrictHostKeyChecking=no",
        "gestoria@217.216.48.91",
        "/opt/knowledge-hub/run-mcp.sh"
      ]
    },
    "obs-studio": {
      "type": "stdio",
      "command": "npx",
      "args": ["obs-mcp", "--host", "10.0.0.7", "--port", "4455", "--password", "CONTRASEÑA_OBS"]
    }
  }
}
```

**Nota:** `.mcp.json` lo usa Claude Code CLI, no Desktop. Desktop usa `claude_desktop_config.json`.
Son dos archivos diferentes para dos clientes diferentes del mismo sistema.

---

## 4.10 Verificacion final

Despues de configurar todo y reiniciar Desktop:

1. **Verificar tuneles:**
   En Desktop Chat escribir: "dame el estado de los tuneles"
   Debe responder con 5 tuneles y `"connected": true` en todos.

2. **Verificar KB:**
   En Desktop Chat escribir: "busca en KB la palabra sypnose"
   Debe responder con entradas del KB. Si dice "No encontrado" o error de conexion,
   los tuneles no estan activos.

3. **Verificar skills:**
   Escribir `/sm-protocol`
   Debe mostrar el flujo de 6 pasos del protocolo SM.

4. **Verificar identidad SM:**
   Si configuraste el Proyecto SYPNOSE (ver Parte 4.8 de la guia principal),
   abrir un chat dentro de ese proyecto y escribir: "quien eres?"
   Debe responder identificandose como Service Manager.

**Si algo no funciona:**
- Cerrar Desktop completamente (incluyendo bandeja del sistema / menubar)
- Esperar 5 segundos
- Volver a abrir
- Los MCPs se reinician al arrancar

---

---

# PARTE 5: Configurar Claude Code Chat Web

## 5.1 Que es Claude Code Chat Web

Claude Code Chat Web es el cliente de Claude disponible en `claude.ai` (navegador) o via
Claude Code CLI en modo interactivo. En el sistema SYPNOSE se usa principalmente como
**arquitecto** — el agente que ejecuta trabajo en el servidor.

A diferencia de Desktop (que coordina), Claude Code:
- Ejecuta comandos Bash
- Lee y escribe archivos
- Hace commits en git
- Corre sub-agentes (Task)
- Tiene acceso a MCP tools via `.mcp.json`

En el sistema de Carlos, Claude Code CLI corre en el **servidor Contabo** dentro de
sesiones tmux. No en la PC local (aunque puede usarse ahi tambien).

---

## 5.2 Diferencias con Desktop

| Capacidad | Desktop Chat | Claude Code CLI |
|---|---|---|
| KB (via MCP) | SI — via supergateway SSE | SI — via SSH directo o `.mcp.json` |
| SSH al servidor | SI — via MCP ssh-mcp | SI — directamente (es el servidor) |
| Leer/escribir archivos | NO (solo lectura limitada) | SI — Read, Write, Edit, Bash |
| Hooks Boris | NO | SI — `.claude/hooks/` |
| Agent Teams | NO | SI — TeamCreate |
| Git commits | NO | SI |
| Skills | SI — `~/.claude/skills/` | SI — `~/.claude/skills/` |
| MCP config | `claude_desktop_config.json` | `.mcp.json` del proyecto |
| Config global | `claude_desktop_config.json` | `~/.claude/settings.json` |
| Config por proyecto | No aplica | `.claude/settings.json` o `settings.local.json` |

**Regla practica:**
- Desktop = pensar y coordinar
- Claude Code = ejecutar y construir

---

## 5.3 Configurar MCPs en Claude Code CLI

Los MCPs de Claude Code se configuran en dos archivos:

### Archivo global: `~/.claude/settings.json` (o `C:\Users\TU_USUARIO\.claude\settings.json`)

Aplica a todas las sesiones de Claude Code en cualquier directorio.

```json
{
  "mcpServers": {
    "boris": {
      "command": "python",
      "args": ["-u", "/home/USUARIO/.boris/boris_spy.py"],
      "env": {
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```

### Archivo de proyecto: `.mcp.json` en la raiz del proyecto

Aplica solo cuando Claude Code esta en ese directorio. Tiene prioridad sobre el global.

Ejemplo para un proyecto en el servidor:
```json
{
  "mcpServers": {
    "boris": {
      "command": "python",
      "args": ["-u", "/home/gestoria/.boris/boris_spy.py"],
      "env": {
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUNBUFFERED": "1"
      }
    },
    "knowledge-hub": {
      "command": "ssh",
      "args": [
        "-T", "-p", "2024",
        "-o", "StrictHostKeyChecking=no",
        "gestoria@217.216.48.91",
        "/opt/knowledge-hub/run-mcp.sh"
      ]
    }
  }
}
```

### Si KB esta en el mismo servidor (arquitecto local al KB)

Si Claude Code corre directamente en el servidor donde esta el KB, puedes conectar
sin SSH — usando el script MCP local:

```json
"knowledge-hub": {
  "command": "node",
  "args": ["/opt/knowledge-hub/src/mcp-server.js"]
}
```

O usando el script `run-mcp.sh` que ya configura el entorno:
```json
"knowledge-hub": {
  "command": "/opt/knowledge-hub/run-mcp.sh"
}
```

---

## 5.4 Instalar Skills

Los skills de Claude Code van en `~/.claude/skills/` (misma ruta en servidor y en PC).

En el servidor (via SSH):
```bash
ssh -p 2024 gestoria@217.216.48.91

# Crear directorio
mkdir -p ~/.claude/skills

# Descargar skills del arquitecto
curl -o ~/.claude/skills/boris-workflow.md \
  https://raw.githubusercontent.com/radelqui/sypnose/main/skills/boris-workflow.md

curl -o ~/.claude/skills/sypnose-create-plan.md \
  https://raw.githubusercontent.com/radelqui/sypnose/main/skills/sypnose-create-plan.md
```

Los skills del SM (`sm-protocol`) van solo en Desktop (PC local), no en el servidor.
El arquitecto no necesita sm-protocol — ese es trabajo del SM.

---

## 5.5 Settings del proyecto (.claude/settings.local.json)

Cada proyecto en el servidor necesita su propio `settings.local.json` para que
Claude Code funcione en modo automatico sin pedir permisos.

**Ruta:** `~/MI_PROYECTO/.claude/settings.local.json`

```json
{
  "permissions": {
    "defaultMode": "auto",
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Edit(*)",
      "Write(*)",
      "Glob(*)",
      "Grep(*)",
      "MultiEdit(*)",
      "mcp__*",
      "Agent(*)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo reboot*)",
      "Write(.env*)",
      "Edit(.env*)"
    ]
  }
}
```

Este archivo NO se sube a git. Agregar al `.gitignore`:
```
.claude/settings.local.json
```

---

## 5.6 Configurar auto mode (sin pedir permisos)

Por defecto Claude Code pregunta confirmacion antes de ejecutar comandos.
En modo arquitecto esto es inaceptable — el arquitecto tiene que ejecutar planes
completos de forma autonoma sin que nadie responda.

### Solucion definitiva (28-Mar-2026) — tres capas

Las tres capas juntas son necesarias. Una sola no es suficiente en v2.1.52.

**Capa 1: Alias en .bashrc del servidor**
```bash
echo 'alias claude="claude --dangerously-skip-permissions"' >> ~/.bashrc
source ~/.bashrc
```

**Capa 2: settings.json global con bypassPermissions**

`~/.claude/settings.json` (en el servidor):
```json
{
  "bypassPermissions": true,
  "skipDangerousModePermissionPrompt": true
}
```

**Capa 3: settings.local.json por proyecto**

Como se vio en 5.5 — con `"defaultMode": "auto"` y la lista de `allow`.

Con las tres capas juntas, Claude Code arranca directamente sin preguntar.

### Si ya esta corriendo y pregunta permisos

Dentro de la sesion de Claude Code (en tmux), presionar `Shift+Tab` para cambiar
a modo "auto" en tiempo real sin reiniciar.

### Nota sobre versiones nuevas (v2.1.80+)

Las versiones recientes tienen un clasificador Sonnet 4.6 que evalua cada accion
automaticamente — mas seguro que `--dangerously-skip-permissions`. Cuando sea seguro
actualizar (sin el memory leak de v2.1.72-73), migrar a este modo.

---

## 5.7 Limitaciones conocidas

| Limitacion | Causa | Solucion |
|---|---|---|
| Memory leak en v2.1.72-73 | Bug conocido de Anthropic | Usar v2.1.52, update BLOQUEADO (`CLAUDE_CODE_DISABLE_AUTOUPDATE=1`) |
| `/btw` no disponible | Solo en v2.1.72+ | No usar hasta que sea seguro actualizar |
| Claude Code Web (navegador) no tiene MCPs | Solo Desktop y CLI tienen MCPs | Usar CLI en servidor, no el chat web |
| Sesiones tmux pierden contexto al hacer compact | El compacto limpia contexto | Cozempic protege esto (ver Parte 3) |
| `settings.json` solo con bypassPermissions no basta en v2.1.52 | Bug de la version | Usar las tres capas del punto 5.6 |
| MCPs no cargan si Claude Code arranca fuera del directorio del proyecto | `.mcp.json` es local al proyecto | Siempre arrancar Claude Code DESDE el directorio del proyecto |

---

---

# PARTE 6: Instalar Knowledge Hub (Bus de Comunicacion)

## 6.1 Que es Knowledge Hub

Knowledge Hub (KB) es la **memoria compartida y bus de comunicacion** de SYPNOSE.

Es una base de datos SQLite con una API REST encima y un servidor MCP que permite
a Desktop y a los arquitectos leer y escribir en la misma memoria.

Piensa en el KB como el **sistema nervioso** de SYPNOSE:
- El SM escribe tareas en el KB
- Los arquitectos leen las tareas y escriben resultados
- El SM lee los resultados y los reporta al usuario
- Nadie necesita llamar al otro directamente — todo pasa por el KB

### Que guarda el KB

| Tipo de dato | Ejemplo |
|---|---|
| Tareas para arquitectos | "Migrar base de datos a PostgreSQL 16" |
| Resultados de trabajo | "Migración completada, hash abc123, 71 tablas OK" |
| Estado de proyectos | "GestoriaRD: fase 3 completada, fase 4 pendiente" |
| Lecciones aprendidas | "El puerto 5432 ya estaba en uso — verificar antes de migrar" |
| Planes aprobados | Planes completos con waves y verificacion |
| Notificaciones | Alertas de arquitectos al SM |

---

## 6.2 Arquitectura del sistema

```
[Carlos]
    |
    | habla con
    v
[Desktop Chat / SM]  ←→  [Knowledge Hub API :18793 SSE]
                              |
                              | via SSH tunnel (sypnose-tunnels MCP)
                              |
                         [Servidor Linux]
                              |
                         [Knowledge Hub :18791]
                         [SQLite: /opt/knowledge-hub/kb.sqlite]
                              |
                    +----+----+----+----+
                    |    |    |    |    |
                 [Arq1][Arq2][Arq3][Arq4][Arq5]
               (tmux sessions con Claude Code)
```

El flujo de comunicacion:
1. SM escribe tarea en KB via SSE (puerto 18793, tunel)
2. Arquitecto lee KB via SSH directo (puerto 18791, local al servidor)
3. Arquitecto ejecuta trabajo, escribe resultado en KB
4. SM recibe notificacion via SSE
5. SM reporta a Carlos

---

## 6.3 Instalacion en el servidor

Conectarse al servidor:
```bash
ssh -p 2024 gestoria@217.216.48.91
```

### Requisitos previos

```bash
# Verificar Node.js 18+
node --version
# Si no esta instalado:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar git
git --version
```

### Clonar e instalar

```bash
cd /opt
sudo git clone https://github.com/anthropics/knowledge-hub.git
cd knowledge-hub
sudo npm install
```

### Crear directorio de datos

```bash
sudo mkdir -p /opt/knowledge-hub/data
sudo chown gestoria:gestoria /opt/knowledge-hub/data
```

### Crear script run-mcp.sh

Este script lo usan los arquitectos para conectar al KB via MCP:

```bash
sudo bash -c 'cat > /opt/knowledge-hub/run-mcp.sh << '"'"'EOF'"'"'
#!/bin/bash
export KB_DATA_DIR=/opt/knowledge-hub/data
export KB_PORT=18791
export KB_SSE_PORT=18793
cd /opt/knowledge-hub
exec node src/mcp-server.js
EOF'

sudo chmod +x /opt/knowledge-hub/run-mcp.sh
```

### Configuracion del entorno

```bash
sudo bash -c 'cat > /opt/knowledge-hub/.env << EOF
KB_PORT=18791
KB_SSE_PORT=18793
KB_DATA_DIR=/opt/knowledge-hub/data
KB_DB_PATH=/opt/knowledge-hub/data/kb.sqlite
KB_LOG_LEVEL=info
EOF'
```

---

## 6.4 Configurar systemd (arranque automatico)

Para que el KB arranque solo cuando el servidor reinicia:

```bash
sudo bash -c 'cat > /etc/systemd/system/knowledge-hub.service << EOF
[Unit]
Description=Knowledge Hub MCP Server
After=network.target

[Service]
Type=simple
User=gestoria
WorkingDirectory=/opt/knowledge-hub
EnvironmentFile=/opt/knowledge-hub/.env
ExecStart=/usr/bin/node src/mcp-server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF'
```

Activar el servicio:
```bash
sudo systemctl daemon-reload
sudo systemctl enable knowledge-hub
sudo systemctl start knowledge-hub
```

Verificar que arranco:
```bash
sudo systemctl status knowledge-hub
# Debe mostrar: Active: active (running)
```

Ver logs en tiempo real:
```bash
sudo journalctl -u knowledge-hub -f
```

---

## 6.5 Verificar que KB funciona

### Test via curl (desde el mismo servidor)

```bash
# Health check
curl http://localhost:18791/health
# Debe responder: {"status":"ok","db":"connected"}

# Guardar una entrada de prueba
curl -X POST http://localhost:18791/kb \
  -H "Content-Type: application/json" \
  -d '{"key":"test-instalacion","value":"KB funcionando","project":"sypnose","category":"test"}'
# Debe responder: {"success":true,"id":1}

# Leer la entrada
curl "http://localhost:18791/kb/test-instalacion?project=sypnose"
# Debe mostrar la entrada que guardaste

# Verificar puerto SSE
curl http://localhost:18793/health
# Debe responder igual que :18791
```

### Test desde Desktop Chat (via tunel)

Una vez que Desktop tiene los tuneles activos, en Desktop Chat escribir:
"Guarda en KB key=test-desde-sm value=funciona project=sypnose"

Debe responder que guardo correctamente.
Luego: "Lee del KB key=test-desde-sm project=sypnose"
Debe mostrar "funciona".

---

## 6.6 Endpoints disponibles

Knowledge Hub expone una API REST en el puerto 18791 (y SSE en 18793).

| Metodo | Endpoint | Para que |
|---|---|---|
| `POST` | `/kb` | Guardar entrada |
| `GET` | `/kb/:key?project=X` | Leer entrada por clave exacta |
| `GET` | `/kb/search?q=X&project=Y` | Buscar por texto |
| `GET` | `/kb/list?project=X&category=Y` | Listar entradas con filtros |
| `DELETE` | `/kb/:key?project=X` | Eliminar entrada |
| `POST` | `/kb/prune` | Eliminar entradas antiguas de baja prioridad |
| `GET` | `/kb/context?q=X&project=Y` | Buscar con contexto ampliado |
| `GET` | `/inbox?agent=X` | Ver mensajes pendientes para un agente |
| `POST` | `/inbox/ack` | Marcar mensaje como leido |
| `GET` | `/health` | Estado del servicio |

### Parametros de `/kb POST`

```json
{
  "key": "nombre-unico-de-la-entrada",
  "value": "contenido — texto libre, puede ser largo",
  "project": "nombre-del-proyecto",
  "category": "task|reference|result|decision|notification|test",
  "tier": "HOT|WARM|COLD"
}
```

- `key`: identificador unico dentro del proyecto. Convencion: `tipo-nombre-fecha`
- `project`: agrupa entradas. Facilita busquedas. Ejemplos: `gestoriard`, `sypnose`, `iatrader`
- `category`: clasifica el tipo de contenido
- `tier`: HOT = acceso frecuente (cache), WARM = normal, COLD = archivo

---

## 6.7 Herramientas MCP del KB

Cuando los agentes conectan al KB via MCP, tienen estas herramientas disponibles:

### `kb_save`

Guarda o actualiza una entrada en el KB.

```
Parametros:
- key (obligatorio): identificador unico
- value (obligatorio): contenido a guardar
- project (opcional): proyecto, default "default"
- category (opcional): tipo de entrada
- tier (opcional): HOT/WARM/COLD
```

Ejemplo de uso en un agente:
```
kb_save key="task-gestoriard-migrar-db-28mar"
        value="## TAREA: Migrar BD..."
        project="gestoriard"
        category="task"
```

### `kb_read`

Lee una entrada por clave exacta.

```
Parametros:
- key (obligatorio): clave exacta
- project (opcional): proyecto
```

### `kb_search`

Busca entradas por texto libre.

```
Parametros:
- query (obligatorio): texto a buscar
- project (opcional): filtrar por proyecto
- category (opcional): filtrar por categoria
- limit (opcional): maximo de resultados, default 10
```

### `kb_list`

Lista entradas con filtros.

```
Parametros:
- project (opcional): filtrar por proyecto
- category (opcional): filtrar por categoria
- tier (opcional): filtrar por tier
- limit (opcional): maximo, default 20
```

### `kb_context`

Como kb_search pero devuelve mas contexto alrededor de cada resultado.
Util para buscar lecciones aprendidas o historial.

### `kb_prune`

Limpia entradas antiguas de tier COLD para liberar espacio.

```
Parametros:
- older_than_days (opcional): dias, default 30
- project (opcional): limitar a un proyecto
```

### `kb_inbox_check`

Lee mensajes pendientes en el inbox del agente actual.
Los arquitectos usan esto al arrancar para ver si tienen tareas nuevas.

---

## 6.8 Protocolo de comunicacion SM y arquitectos

El KB es un bus asincrono. Los agentes no se llaman directamente — escriben mensajes
en el KB y el otro los lee cuando arranca.

### Flujo basico

```
SM crea tarea
    → kb_save key="task-{arq}-{nombre}" category="task" project="{proyecto}"

SM notifica al arquitecto
    → sm-tmux send {sesion} "kb_read key=task-{arq}-{nombre} project={proyecto}"

Arquitecto lee la tarea
    → kb_read key="task-{arq}-{nombre}" project="{proyecto}"

Arquitecto ejecuta y guarda resultado
    → kb_save key="result-{arq}-{nombre}" category="result" project="{proyecto}"

Arquitecto notifica al SM
    → kb_save key="notif-{nombre}-{fecha}" category="notification" project="sypnose"

SM recibe notificacion (al hacer kb_list category=notification)
    → lee el resultado, informa a Carlos
```

### Convencion de nombres de claves

| Tipo | Formato | Ejemplo |
|---|---|---|
| Tarea | `task-{arq}-{descripcion}` | `task-gestoriard-migrar-bd` |
| Resultado | `result-{arq}-{descripcion}` | `result-gestoriard-migrar-bd` |
| Notificacion | `notif-{descripcion}-{fecha}` | `notif-migrar-bd-28mar` |
| Plan | `plan-{descripcion}` | `plan-fase3-gestoriard` |
| Decision | `decision-{descripcion}` | `decision-arquitectura-cache` |
| Leccion | `lesson-{descripcion}` | `lesson-puerto-5432-ocupado` |
| Estado | `state-{arq}` | `state-gestoriard` |

---

## 6.9 Bus de tareas — formato estandar

Cada tarea enviada a un arquitecto DEBE usar este formato. Incluye 6 etiquetas
obligatorias que Gemini verifica antes de que Carlos de el OK final.

```markdown
## TAREA: [descripcion corta — max 60 chars]

STATUS: PENDIENTE
TO: [nombre-arquitecto]
FROM: SM
TIMESTAMP: [fecha ISO — 2026-03-28T14:30:00]
PRIORIDAD: ALTA|MEDIA|BAJA

### CONTEXTO
[Por que se hace esta tarea. Que problema resuelve.]

### PLAN
[Los pasos concretos que el arquitecto debe ejecutar.
Divididos en waves si hay dependencias.]

Wave 1 (paralelo):
- [ ] Paso A
- [ ] Paso B

Wave 2 (depende de Wave 1):
- [ ] Paso C

### MODELO
Sub-agentes: model sonnet. NUNCA opus.

### BORIS
Verificacion obligatoria antes de cada commit.
Usar boris_verify con evidencia concreta.

### VERIFICACION
[Como saber que la tarea esta correctamente terminada.
Incluir comandos concretos para verificar.]

### EVIDENCIA
[Que debe reportar el arquitecto al terminar.
Ser especifico: hash del commit, output del test, URL funcionando, etc.]

### KB
Al terminar: kb_save key="result-[arq]-[descripcion]"
             value="[resumen del resultado]"
             project="[proyecto]"
             category="result"

### MODO AUTONOMO
Ejecuta todo sin preguntar. NO pidas confirmacion.
Si ves algo que mejorar en este plan, mejoralo directamente.
Tú conoces el codigo mejor que el SM.
```

### Los 6 elementos que Gemini verifica

| Etiqueta | Que verifica Gemini |
|---|---|
| PLAN | Los pasos son concretos y ejecutables |
| TAREA | La descripcion es clara y tiene contexto |
| MODELO | Dice "model sonnet, NUNCA opus" |
| BORIS | Incluye instruccion de verificacion |
| VERIFICACION | Tiene comandos o criterios concretos |
| EVIDENCIA | Especifica que debe reportar el arquitecto |

Si Gemini dice que falta alguno, el SM corrige el plan antes de enviarlo.

---

## 6.10 Ejemplo de flujo completo de una tarea

Escenario: Carlos pide migrar GestoriaRD a PostgreSQL 16.

### Paso 1: SM crea plan (Desktop Chat)

Carlos dice: "Necesito migrar la BD de GestoriaRD a PostgreSQL 16"

SM invoca `/sm-protocol` y redacta el plan completo con las 6 etiquetas.
Lo muestra a Carlos.

### Paso 2: SM guarda el plan en KB

```
kb_save
  key="task-gestoriard-migrar-pg16-28mar"
  value="[plan completo]"
  project="gestoriard"
  category="task"
```

### Paso 3: Gemini valida

SM via SSH envia el plan a Gemini para validacion:
```
sm-tmux approve gestoriard "kb_read key=task-gestoriard-migrar-pg16-28mar project=gestoriard"
```

Gemini verifica las 6 etiquetas. Si todo OK, responde "APROBADO".

### Paso 4: Carlos aprueba

SM: "Gemini aprobó. Las 6 etiquetas presentes. ¿Damos OK?"
Carlos: "okey"

### Paso 5: SM guarda version final

```
kb_save
  key="task-gestoriard-migrar-pg16-28mar"
  value="[plan final aprobado]"
  project="gestoriard"
  category="task"
  tier="HOT"
```

### Paso 6: SM notifica al arquitecto

```
sm-tmux send gestoriard "kb_read key=task-gestoriard-migrar-pg16-28mar project=gestoriard"
```

El arquitecto en tmux recibe el mensaje, lee el KB, y empieza a ejecutar.

### Paso 7: Arquitecto ejecuta (servidor tmux: gestoriard)

```bash
# Wave 1: backup + verificacion version actual
docker commit gestoriard-container gestoriard-backup-28mar
pg_dump gestoriard_db > /backup/gestoriard-28mar.sql

# Wave 2: upgrade
apt-get install -y postgresql-16
pg_upgradecluster ...

# Boris verify antes del commit
boris_verify what_changed="..." how_verified="..." result="..."

git add -A
git commit -m "[ARCH] Migracion PostgreSQL 16 completada"
git push origin main
```

### Paso 8: Arquitecto reporta

```
kb_save
  key="result-gestoriard-migrar-pg16-28mar"
  value="STATUS: COMPLETADO\nCommit: abc123\nPG16 corriendo\n71 tablas OK\ncurl /api/health: 200"
  project="gestoriard"
  category="result"
```

```
kb_save
  key="notif-gestoriard-migrar-pg16-28mar"
  value="GestoriaRD migracion PG16 completada. Ver result-gestoriard-migrar-pg16-28mar"
  project="sypnose"
  category="notification"
```

### Paso 9: SM recibe notificacion (Desktop Chat)

SM al arrancar hace: `kb_list category=notification`
Ve la notificacion, lee el resultado, informa a Carlos:

"La migración a PostgreSQL 16 está completada. Commit abc123 en main. 71 tablas OK,
API respondiendo 200. ¿Verifico en el navegador?"

---

## 6.11 Que puede salir mal

### KB no arranca

```bash
# Ver que falla
sudo systemctl status knowledge-hub
sudo journalctl -u knowledge-hub -n 50

# Causas comunes:
# 1. Node.js no encontrado en la ruta del servicio
sudo which node
# Si no esta en /usr/bin/node, actualizar ExecStart en el .service

# 2. Puerto ya en uso
ss -tlnp | grep 18791
# Si hay algo ahi, matar el proceso: kill -9 PID

# 3. Permisos en /opt/knowledge-hub
ls -la /opt/knowledge-hub/
sudo chown -R gestoria:gestoria /opt/knowledge-hub/
```

### Desktop no conecta al KB (error en tunnel_status)

```bash
# Verificar que los servicios corren en el servidor
ssh -p 2024 gestoria@217.216.48.91 "ss -tlnp | grep -E '18791|18793'"
# Debe mostrar dos entradas

# Verificar que la SSH key funciona desde la PC
ssh -p 2024 -i C:/Users/TU_USUARIO/.ssh/id_rsa gestoria@217.216.48.91 "echo OK"
# Debe responder: OK

# Si la key no funciona, regenerar y copiar al servidor:
# Windows PowerShell:
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa"
type "$env:USERPROFILE\.ssh\id_rsa.pub" | ssh -p 2024 gestoria@217.216.48.91 "cat >> ~/.ssh/authorized_keys"
```

### EADDRINUSE — puerto ya en uso

```bash
# En Windows: encontrar que usa el puerto
netstat -ano | findstr "18793"
# Nota el PID de la columna derecha
taskkill /PID [numero] /F

# En Linux:
fuser -k 18793/tcp
```

### KB responde pero los datos no persisten

El problema es que SQLite necesita el directorio de datos correcto.

```bash
# Verificar que el .env tiene la ruta correcta
cat /opt/knowledge-hub/.env
# KB_DB_PATH debe apuntar a un directorio que exista y tenga permisos

# Verificar que el archivo .sqlite existe
ls -la /opt/knowledge-hub/data/
# Si no existe:
touch /opt/knowledge-hub/data/kb.sqlite
chown gestoria:gestoria /opt/knowledge-hub/data/kb.sqlite
sudo systemctl restart knowledge-hub
```

### El arquitecto no recibe la notificacion de tarea

El problema mas comun: el SM envio via `sm-tmux send` pero el arquitecto no estaba
mirando la sesion tmux.

```bash
# En el servidor, ver el historial de la sesion
tmux capture-pane -t gestoriard -p | tail -30

# Si la sesion no existe:
tmux list-sessions
# Si no esta, el arquitecto no esta corriendo

# Solucion: el arquitecto al arrancar SIEMPRE hace:
kb_list category=task project=gestoriard
# Esto muestra todas las tareas pendientes aunque no haya visto el send
```

### El KB crece demasiado

Despues de semanas de uso, el KB acumula entradas viejas.

```bash
# Ver cuantas entradas hay
curl http://localhost:18791/kb/list | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total: {len(d)}')"

# Limpiar entradas COLD de mas de 30 dias
curl -X POST http://localhost:18791/kb/prune \
  -H "Content-Type: application/json" \
  -d '{"older_than_days": 30}'

# O via MCP en el agente:
# kb_prune older_than_days=30
```

### Desktop recibe entradas duplicadas o corruptas

Si el SM guarda la misma clave dos veces, KB actualiza la entrada (no duplica).
Si los datos parecen corruptos, verificar el archivo SQLite:

```bash
sqlite3 /opt/knowledge-hub/data/kb.sqlite ".tables"
sqlite3 /opt/knowledge-hub/data/kb.sqlite "SELECT key, category, tier FROM entries ORDER BY updated_at DESC LIMIT 10;"
```

Si el archivo esta corrompido (raro pero posible si el servidor se apago brusco):
```bash
# Backup primero
cp /opt/knowledge-hub/data/kb.sqlite /backup/kb-corrupto-$(date +%Y%m%d).sqlite

# Intentar reparar
sqlite3 /opt/knowledge-hub/data/kb.sqlite "PRAGMA integrity_check;"
sqlite3 /opt/knowledge-hub/data/kb.sqlite ".recover" | sqlite3 /opt/knowledge-hub/data/kb-recovered.sqlite
mv /opt/knowledge-hub/data/kb-recovered.sqlite /opt/knowledge-hub/data/kb.sqlite
sudo systemctl restart knowledge-hub
```

---

*Fin de las Partes 4, 5 y 6 del Manual Sypnose.*
*Version: 28-Mar-2026*


---

# Manual Sypnose — Partes 7, 8 y 9

---

## TABLA DE CONTENIDOS

- [Parte 7: Instalar Boris v6.2 (Verificacion)](#parte-7-instalar-boris-v62-verificacion)
  - [7.1 Que es Boris](#71-que-es-boris)
  - [7.2 Las 5 Leyes de Hierro](#72-las-5-leyes-de-hierro)
  - [7.3 Los 5 hooks de Boris](#73-los-5-hooks-de-boris)
  - [7.4 Instalacion paso a paso](#74-instalacion-paso-a-paso)
  - [7.5 Estructura de .brain/](#75-estructura-de-brain)
  - [7.6 Formato de evidencia](#76-formato-de-evidencia)
  - [7.7 Flujo completo de trabajo con Boris](#77-flujo-completo-de-trabajo-con-boris)
  - [7.8 Que puede salir mal](#78-que-puede-salir-mal)

- [Parte 8: Configurar Arquitectos (cada proyecto)](#parte-8-configurar-arquitectos-cada-proyecto)
  - [8.1 Crear sesion tmux por proyecto](#81-crear-sesion-tmux-por-proyecto)
  - [8.2 settings.json estandar](#82-settingsjson-estandar)
  - [8.3 settings.local.json](#83-settingslocaljson)
  - [8.4 Las 3 reglas obligatorias en .claude/rules/](#84-las-3-reglas-obligatorias-en-clauderules)
  - [8.5 .mcp.json — MCPs por proyecto](#85-mcpjson--mcps-por-proyecto)
  - [8.6 Estructura inicial de .brain/](#86-estructura-inicial-de-brain)
  - [8.7 CLAUDE.md del proyecto — template](#87-claudemd-del-proyecto--template)
  - [8.8 Tabla comparativa: lo que debe ser IGUAL en todos](#88-tabla-comparativa-lo-que-debe-ser-igual-en-todos)
  - [8.9 Ejemplo completo: configurar un arquitecto desde cero](#89-ejemplo-completo-configurar-un-arquitecto-desde-cero)

- [Parte 9: Instalar Sypnose Agent Dashboard (Codeman)](#parte-9-instalar-sypnose-agent-dashboard-codeman)
  - [9.1 Que es Codeman](#91-que-es-codeman)
  - [9.2 Instalar en el servidor](#92-instalar-en-el-servidor)
  - [9.3 Crear servicio systemd](#93-crear-servicio-systemd)
  - [9.4 Configurar Codeman](#94-configurar-codeman)
  - [9.5 Conectar proyectos existentes](#95-conectar-proyectos-existentes)
  - [9.6 Acceso desde tu PC](#96-acceso-desde-tu-pc)
  - [9.7 Branding Sypnose (colores Anthropic)](#97-branding-sypnose-colores-anthropic)
  - [9.8 Monitor de sesiones](#98-monitor-de-sesiones)
  - [9.9 Que puede salir mal](#99-que-puede-salir-mal)

---

## PARTE 7: Instalar Boris v6.2 (Verificacion)

### 7.1 Que es Boris

Boris es el sistema de control de calidad de Sypnose.

**El problema que resuelve:** Los agentes IA cometen codigo roto. Dicen frases como "deberia funcionar" o "creo que esta correcto" sin verificar nada. El codigo llega a produccion, falla, y tu pierdes horas debuggeando lo que el agente juro que estaba bien.

**La solucion de Boris:** Inserta una puerta entre el trabajo del agente y el git commit. El agente no puede hacer commit hasta que:

1. Haya verificado el cambio de verdad (tests, curl, UI, etc.)
2. Haya escrito evidencia concreta en `.brain/last-verification.md`
3. El hook valide que la evidencia es real (sin frases vagas, con longitud minima)

**La clave tecnica:** Boris usa `exit 2` en los hooks de Claude Code. Este es un bloqueo deterministico — el agente NO puede saltarselo, ignorarlo ni argumentar contra el. Sin evidencia, el commit simplemente no pasa.

**Sin evidencia, sin commit. Sin excepciones.**

Boris ademas gestiona la memoria del agente entre sesiones: si Claude pierde contexto (compact, crash, reinicio), Boris tiene todo guardado en `.brain/` y el agente puede continuar exactamente donde quedo.

---

### 7.2 Las 5 Leyes de Hierro

Estas leyes son inquebrantables. Boris las hace cumplir via hooks.

**Ley 1: Sin evidencia, sin commit**
El agente debe escribir evidencia concreta en `.brain/last-verification.md` antes de cada commit. El hook lee ese archivo. Si no existe o no tiene el sello `APROBADO`, el commit se bloquea con `exit 2`.

**Ley 2: La evidencia se consume al usarse**
Cada commit elimina el archivo de evidencia. Para el siguiente commit, el agente debe generar evidencia nueva. No se reutilizan verificaciones anteriores. Cada cambio requiere su propia prueba.

**Ley 3: Las frases vagas son rechazadas**
El hook escanea el texto de la evidencia. Si encuentra alguna de estas frases, el commit se bloquea:
- "should work" / "deberia funcionar"
- "I think" / "creo que"
- "seems like" / "parece que"
- "probably" / "probablemente"

**Ley 4: El agente no puede modificar sus propios hooks**
Las reglas deny en `settings.json` impiden que el agente edite sus propios hooks o su configuracion. No puede desactivar Boris ni saltarse las reglas.

```json
"deny": [
  "Edit(.claude/hooks/*)",
  "Write(.claude/hooks/*)",
  "Edit(.claude/settings.json)",
  "Write(.claude/settings.json)"
]
```

**Ley 5: Evidencia y commit deben ser operaciones separadas**
El hook detecta si el agente intenta encadenar `echo "..." > .brain/last-verification.md && git commit` en un solo comando. Eso se bloquea. Primero escribe la evidencia, luego, en una operacion separada, hace el commit.

---

### 7.3 Los 5 hooks de Boris

Boris instala exactamente 5 hooks en `.claude/hooks/`:

| Hook | Tipo Claude Code | Que hace |
|------|-----------------|----------|
| `boris-verification-gate.sh` | PreToolUse (Bash) | Bloquea git commit sin evidencia aprobada |
| `boris-session-start.sh` | SessionStart | Muestra tarea actual, estado, archivos sin commit al arrancar |
| `boris-pre-compact.sh` | PreCompact | Auto-guarda estado antes de compactar el contexto |
| `boris-stop.sh` | Stop | Auto-commitea `.brain/` y hace push al terminar sesion |
| `boris-protect-files.sh` | PreToolUse (Edit/Write) | Bloquea edicion de .env, credenciales y claves privadas |

**Como interactuan:**

```
Agente arranca
    ↓
boris-session-start.sh → muestra donde quedo el agente
    ↓
Agente trabaja...
    ↓  (cada 15-20 min)
boris-pre-compact.sh → guarda estado si hay compactacion
    ↓
Agente quiere hacer commit
    ↓
boris-verification-gate.sh → valida evidencia o BLOQUEA
    ↓
Agente termina sesion
    ↓
boris-stop.sh → auto-commit .brain/ + git push
```

---

### 7.4 Instalacion paso a paso

**Requisitos previos:**
- Git instalado y el proyecto ya es un repositorio git (`git init` hecho)
- Claude Code CLI instalado
- Bash disponible (en Windows: Git Bash que viene con Git for Windows)

**Paso 1: Descargar el instalador**

```bash
# En el servidor Linux (o Windows via Git Bash):
curl -O https://raw.githubusercontent.com/radelqui/sypnose/main/boris/install-boris.sh
```

Si no tienes conexion a internet o prefieres hacerlo manual, puedes crear el instalador con el contenido de los siguientes pasos.

**Paso 2: Ir al directorio del proyecto**

```bash
# Linux/Mac:
cd ~/mi-proyecto

# Windows (Git Bash):
cd /c/Users/USUARIO/mi-proyecto
```

**Paso 3: Ejecutar el instalador**

```bash
bash install-boris.sh
```

Esto crea automaticamente:
- `.claude/hooks/boris-verification-gate.sh`
- `.claude/hooks/boris-session-start.sh`
- `.claude/hooks/boris-pre-compact.sh`
- `.claude/hooks/boris-stop.sh`
- `.claude/hooks/boris-protect-files.sh`
- `.claude/settings.json` (con hooks + deny rules)
- `.brain/task.md`
- Actualiza `CLAUDE.md` con instrucciones de verificacion

**Paso 4: Dar permisos a los hooks (Linux/Mac solamente)**

```bash
chmod +x .claude/hooks/*.sh
```

En Windows con Git Bash, esto no es necesario.

**Paso 5: Verificar que se instalo correctamente**

```bash
ls .claude/hooks/
# Debe mostrar los 5 archivos .sh

cat .claude/settings.json
# Debe mostrar hooks configurados y deny rules

ls .brain/
# Debe mostrar task.md
```

**Paso 6: Hacer el primer commit con Boris activo**

Antes de hacer cualquier commit, escribe evidencia primero. Intenta hacer un commit sin evidencia para confirmar que Boris funciona:

```bash
git add .
git commit -m "test: verificar que Boris bloquea"
# Debe salir:
# BLOQUEADO: Falta verificación. Usa boris_verify primero.
```

Si ves ese mensaje, Boris esta instalado correctamente.

**Paso 7: Instalar Boris MCP (herramientas MCP)**

El MCP de Boris da herramientas que Claude puede usar directamente:

```bash
pip install mcp pydantic
```

Agregar al `.mcp.json` del proyecto (ver Parte 8 para formato completo):

```json
{
  "mcpServers": {
    "boris": {
      "command": "python3",
      "args": ["/ruta/al/boris-mcp/server.py"],
      "env": {
        "PROJECT_PATH": "/ruta/al/proyecto"
      }
    }
  }
}
```

Las herramientas disponibles despues de instalar el MCP:

| Herramienta MCP | Para que se usa |
|-----------------|-----------------|
| `boris_health` | Verificar que Boris funciona |
| `boris_start_task` | Registrar inicio de una tarea nueva |
| `boris_save_state` | Guardar estado actual (progreso, proximo paso) |
| `boris_verify` | Escribir evidencia y obtener sello APROBADO |
| `boris_get_state` | Leer estado completo de la sesion actual |
| `boris_register_done` | Marcar tarea como completada en done-registry |

---

### 7.5 Estructura de .brain/

El directorio `.brain/` es la memoria persistente del agente. Esta en git, viaja con el proyecto, y sobrevive reinicios.

```
.brain/
├── task.md              ← Tarea actual + progreso (LEER al arrancar)
├── session-state.md     ← Estado exacto de la sesion (fase, branch, commit)
├── history.md           ← Registro permanente de todo lo hecho
├── done-registry.md     ← Lista de tareas completadas
└── last-verification.md ← Evidencia actual (se elimina despues del commit)
```

**task.md — formato obligatorio:**

```markdown
## Tarea actual: [descripcion corta de lo que se esta haciendo]

## Progreso:
- [x] Paso 1 completado
- [ ] Paso 2 pendiente
- [ ] Paso 3 pendiente

## Proximo paso:
[Descripcion exacta de lo que hacer a continuacion — suficientemente
detallada para que otro agente pueda continuar sin contexto adicional]

## Archivos modificados:
- src/componente.tsx
- api/endpoint.ts
```

**session-state.md — formato obligatorio:**

```markdown
Ultima actualizacion: 2026-03-28 14:30
Fase: ejecutando
Branch: main
Ultimo commit: a3f7c91
Proxima accion: Ejecutar npm run build para verificar que no hay errores de TypeScript
```

**history.md — formato obligatorio:**

```markdown
### 2026-03-28 - Arquitecto GestoriaRD — Migrar autenticacion a Supabase
**Estado**: Completado
**Archivos modificados**: lib/auth.ts, app/login/page.tsx, api/session/route.ts
**Cambios realizados**: Reemplazo NextAuth por Supabase Auth. Login, logout y
session persistence funcionando. Tests de autenticacion pasan.
**Pendiente**: Configurar refresh tokens (tarea separada)
```

**done-registry.md — formato:**

```markdown
## Tareas completadas

- 2026-03-28: Migrar autenticacion a Supabase — commit a3f7c91
- 2026-03-27: Configurar Docker compose para desarrollo — commit b2e4d88
- 2026-03-26: Setup inicial del proyecto — commit c1d3f77
```

---

### 7.6 Formato de evidencia

La evidencia va en `.brain/last-verification.md`. El hook valida que:
- El archivo existe
- Contiene el sello `APROBADO` (escrito por `boris_verify` del MCP)
- No contiene frases vagas
- Tiene al menos 30 caracteres de contenido real

**Formato usando el MCP (recomendado):**

El agente llama `boris_verify` con estos parametros:

```
what_changed: "descripcion de lo que cambio"
how_verified: "como lo verificaste (minimo 20 caracteres, concreto)"
result: "resultado real con output (minimo 15 caracteres)"
```

**Ejemplos concretos por tipo de cambio:**

Para una API endpoint:
```
what_changed: "Agregar validacion de email al endpoint POST /api/usuarios"
how_verified: "curl -X POST localhost:3000/api/usuarios -d '{\"email\":\"\"}' retorna 400. curl con email valido retorna 201."
result: "400 {\"error\":\"Email requerido\"} para input vacio. 201 {\"id\":\"uuid\"} para datos validos."
```

Para UI (componente React):
```
what_changed: "Agregar estado de carga al boton de login"
how_verified: "Chrome MCP -> navegar localhost:3000/login -> click en boton -> spinner aparece durante peticion"
result: "Boton muestra spinner SVG animado durante 1.2s hasta que responde la API. Estado visual correcto."
```

Para tests Python:
```
what_changed: "Agregar funcion calcular_iva() en factura.py"
how_verified: "pytest tests/test_factura.py -v -> output: 4 passed in 0.12s"
result: "PASSED test_calcular_iva_21, test_calcular_iva_10, test_calcular_iva_0, test_calcular_iva_negativo"
```

Para archivos de configuracion:
```
what_changed: "Actualizar variables de entorno en .env.production"
how_verified: "curl http://localhost:3000/api/health retorna 200 con DB_STATUS: connected"
result: "200 OK {\"status\":\"healthy\",\"db\":\"connected\",\"version\":\"1.2.3\"}"
```

**Que NO es evidencia valida (Boris rechaza esto):**

```
MALO: "El cambio deberia funcionar ahora"
MALO: "Creo que esto soluciona el problema"
MALO: "Los tests pasan" (sin mostrar output)
MALO: "Ya actualice el archivo" (sin verificar que funciona)
```

---

### 7.7 Flujo completo de trabajo con Boris

Este es el flujo que el agente sigue en cada tarea:

**1. Al arrancar la sesion:**

```
boris_start_task
  name: "Implementar busqueda de facturas"
  description: "Agregar endpoint GET /api/facturas?q=texto con busqueda full-text"
```

Esto crea la tarea en `.brain/task.md` y registra el inicio.

**2. Durante el trabajo (cada 15-20 min):**

```
boris_save_state
  progress: "Endpoint GET /api/facturas creado. Tests unitarios escritos. Falta integrar con PostgreSQL full-text."
  next_step: "Agregar indice GIN en PostgreSQL y actualizar la query en facturas.repository.ts"
```

Esto actualiza `.brain/session-state.md`. Si Claude pierde contexto, puede leer esto y continuar.

**3. Antes del commit:**

```
boris_verify
  what_changed: "Endpoint GET /api/facturas?q=texto con busqueda full-text PostgreSQL"
  how_verified: "curl 'localhost:3000/api/facturas?q=impresora' retorna 3 facturas. curl 'localhost:3000/api/facturas?q=xxxxxxxx' retorna array vacio."
  result: "200 [{id:1,descripcion:'Impresora HP',...},{...}]. 200 [] para termino sin resultados. Tiempo respuesta: 45ms."
```

Boris escribe `.brain/last-verification.md` con el sello `APROBADO`.

**4. El commit:**

```bash
git add src/api/facturas.ts src/repositories/facturas.repository.ts
git commit -m "feat: busqueda full-text en endpoint GET /api/facturas"
```

El hook valida la evidencia, pasa, y elimina `last-verification.md`.

**5. Al terminar la tarea:**

```
boris_register_done
  task_name: "Implementar busqueda de facturas"
  commit_hash: "a3f7c91"
  summary: "Endpoint con busqueda full-text PostgreSQL. 3 tests. Tiempo respuesta 45ms."
```

Esto escribe en `.brain/done-registry.md`.

**6. Al terminar la sesion:**

El hook `boris-stop.sh` se ejecuta automaticamente. Hace commit de `.brain/` y git push. El estado queda guardado para la proxima sesion.

---

### 7.8 Que puede salir mal

**Problema: "BLOQUEADO: Falta verificación" aunque escribi evidencia**

Causa: El archivo `last-verification.md` no contiene el texto `APROBADO`. Esto pasa si escribiste el archivo manualmente en vez de usar `boris_verify` del MCP.

Solucion: Usar siempre `boris_verify` del MCP. El MCP es el unico que escribe el sello correcto.

---

**Problema: El hook no se ejecuta (el commit pasa sin verificar)**

Causa: El hook no tiene permisos de ejecucion (Linux/Mac) o no esta registrado en `settings.json`.

Solucion:
```bash
chmod +x .claude/hooks/*.sh
cat .claude/settings.json  # verificar que PreToolUse tiene el hook configurado
```

---

**Problema: "Cannot read SSH key" al instalar Boris MCP**

Causa: El MCP de Boris no puede leer el archivo de clave SSH para conectarse.

Solucion: Verificar que `PROJECT_PATH` en `.mcp.json` apunta al directorio correcto del proyecto.

---

**Problema: El agente dice "ya verifique" pero no usa boris_verify**

Causa: El agente esta intentando saltarse el sistema escribiendo directo al archivo o diciendo que ya verifico verbalmente.

Solucion: Las reglas en `CLAUDE.md` y `.claude/rules/01-verificacion.md` son claras. Si el agente persiste, el hook lo bloqueara de todas formas cuando intente hacer commit.

---

**Problema: En Windows, bash no esta disponible**

Causa: Git for Windows no esta instalado o Git Bash no esta en el PATH.

Solucion: Instalar Git for Windows desde https://gitforwindows.org/. Claude Code en Windows ejecuta hooks a traves de Git Bash automaticamente.

---

**Problema: El agente pierde contexto y no sabe donde estaba**

Causa: `.brain/task.md` esta vacio o no existe.

Solucion: Verificar que `boris-stop.sh` se ejecuto en la sesion anterior (hace commit de `.brain/` automaticamente). Si el archivo esta vacio, el agente debe preguntar al usuario donde quedo.

---

## PARTE 8: Configurar Arquitectos (cada proyecto)

### 8.1 Crear sesion tmux por proyecto

Cada proyecto tiene su propio arquitecto. Cada arquitecto vive en una sesion tmux separada en el servidor.

**Crear sesion nueva:**

```bash
# Conectarse al servidor
ssh -p PUERTO_SSH USUARIO@IP_SERVIDOR

# Crear sesion tmux para el proyecto (una sola vez)
tmux new-session -d -s nombre-proyecto -c /ruta/al/proyecto

# Verificar que se creo
tmux list-sessions
# Debe mostrar: nombre-proyecto: 1 windows (created...)
```

**Conectarse a una sesion existente:**

```bash
tmux attach -t nombre-proyecto
```

**Desconectarse sin matar la sesion:**

Presiona `Ctrl+B` luego `D`. La sesion sigue corriendo en background. Claude sigue trabajando aunque cierres la terminal.

**Ver todas las sesiones activas:**

```bash
tmux list-sessions
```

**Script automatico (recomendado):**

Este script crea la sesion si no existe, o se conecta si ya existe:

```bash
cat > ~/scripts/tmux-claude.sh << 'SCRIPT'
#!/bin/bash
SESSION="$1"
DIR="$2"

if /usr/bin/tmux has-session -t "$SESSION" 2>/dev/null; then
    /usr/bin/tmux attach -t "$SESSION"
else
    /usr/bin/tmux new-session -d -s "$SESSION" -c "$DIR"
    sleep 1
    /usr/bin/tmux send-keys -t "$SESSION" "claude --continue" Enter
    /usr/bin/tmux attach -t "$SESSION"
fi
SCRIPT
chmod +x ~/scripts/tmux-claude.sh
```

Usar el script:

```bash
~/scripts/tmux-claude.sh gestoriard /home/usuario/gestoriard
~/scripts/tmux-claude.sh iatrader /home/usuario/IATRADER
```

**Nombrado de sesiones — convencion:**

Usa el nombre del proyecto directamente. Sin guiones, sin codigos. Ejemplos:
- `gestoriard`
- `iatrader`
- `facturaia`
- `mi-app`

---

### 8.2 settings.json estandar

Este archivo configura los hooks de Boris y las reglas de permisos. Va en `.claude/settings.json` de cada proyecto.

**Archivo minimo funcional:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/boris-verification-gate.sh"
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/boris-protect-files.sh"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/boris-session-start.sh"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/boris-pre-compact.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/boris-stop.sh"
          }
        ]
      }
    ]
  },
  "permissions": {
    "deny": [
      "Edit(.claude/hooks/*)",
      "Write(.claude/hooks/*)",
      "Edit(.claude/settings.json)",
      "Write(.claude/settings.json)"
    ]
  }
}
```

**Agregar bypassPermissions si el proyecto lo necesita:**

Algunos proyectos necesitan que el agente ejecute comandos sin preguntar permiso en cada herramienta. Agregar despues de `"permissions"`:

```json
"bypassPermissions": true
```

ATENCION: Solo usar `bypassPermissions: true` en proyectos de desarrollo donde confias en el agente. Nunca en proyectos con acceso a datos de produccion sin supervision.

---

### 8.3 settings.local.json

Este archivo tiene configuracion local que NO va a git. Util para override de settings del equipo.

Ruta: `.claude/settings.local.json`

**Ejemplo tipico:**

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-..."
  }
}
```

Este archivo va en `.gitignore` para no exponer credenciales:

```bash
echo ".claude/settings.local.json" >> .gitignore
```

---

### 8.4 Las 3 reglas obligatorias en .claude/rules/

Cada proyecto debe tener estas 3 reglas en `.claude/rules/`. Son los archivos que Claude Code lee automaticamente al arrancar.

**Regla 1: verificacion (01-verificacion.md)**

Ruta: `.claude/rules/01-verificacion.md`

```markdown
---
description: Reglas de verificacion obligatoria para todo cambio
globs: ["**/*"]
---

# LEY DE VERIFICACION -- OBLIGATORIO SIEMPRE

## NO puedes hacer commit sin verificar. El hook lo bloquea.

Para hacer commit necesitas:
1. Verificar el cambio (ver abajo como)
2. Llamar boris_verify del MCP con evidencia concreta
3. El MCP escribe .brain/last-verification.md con Estado: APROBADO
4. El hook verifica que el MCP aprobo
5. Entonces git commit pasa

## Como verificar segun tipo de cambio:

- UI (.tsx, .jsx, .html, .css, .vue): Chrome MCP -> navega -> clickea -> confirma
- API endpoint: curl -X METHOD url -d 'datos' -> response con status code
- Base de datos: Query SELECT que confirme el cambio
- Python (.py): pytest -> output con PASSED
- JavaScript (.ts, .js): npm test o npm run build -> output
- Rust (.rs): cargo test -> output
- Config/deploy: curl health endpoint -> servicio responde
- Fix de bug: Reproduce escenario original -> confirma que ya no falla
- Docker: docker ps + curl health -> container running
- Shell (.sh): bash -n [archivo] -> syntax OK

## Formato de evidencia (boris_verify del MCP):

what_changed: "que cambiaste"
how_verified: "como lo verificaste (min 20 chars, concreto)"
result: "resultado real (min 15 chars, con output)"

## PROHIBIDO:
- "Deberia funcionar" -> NO ES EVIDENCIA
- "Ya lo cambie" sin resultado -> NO ES EVIDENCIA
- "Los tests pasan" sin output -> NO ES EVIDENCIA
```

**Regla 2: memoria (02-memory-protocol.md)**

Ruta: `.claude/rules/02-memory-protocol.md`

```markdown
---
description: Protocolo de memoria persistente
globs: ["**/*"]
---

# PROTOCOLO DE MEMORIA -- ASSUME INTERRUPCION

Tu contexto puede resetearse EN CUALQUIER MOMENTO.
Todo lo que no este en archivo se PIERDE.

## AL EMPEZAR:
1. Llama boris_get_state del MCP -> te da todo el estado
2. O lee manualmente:
   - .brain/task.md -> que estabas haciendo
   - .brain/session-state.md -> donde quedaste
   - .brain/done-registry.md -> que ya se hizo
3. Si hay tarea pendiente -> CONTINUA
4. El hook SessionStart te muestra esto automaticamente

## MIENTRAS trabajas (cada 15-20 min):
Llama boris_save_state del MCP con:
- progress: que has completado
- next_step: que vas a hacer

## SI PIERDES CONTEXTO:
1. El hook SessionStart te muestra todo automaticamente
2. Llama boris_get_state para el estado completo
3. Lee .brain/ y CONTINUA. NO empieces de cero.
```

**Regla 3: proyecto (03-project-specific.md)**

Ruta: `.claude/rules/03-project-specific.md`

Esta regla es distinta en cada proyecto. Contiene informacion especifica del stack y las convenciones.

```markdown
---
description: Reglas especificas de este proyecto
globs: ["**/*"]
---

# REGLAS DEL PROYECTO -- [NOMBRE DEL PROYECTO]

## Arquitectura
[Descripcion breve de como esta organizado el codigo]

## Stack
[Tecnologias principales: Node.js 22, Next.js 15, PostgreSQL, etc.]

## Comandos de desarrollo
Build: npm run build
Test: npm test
Lint: npm run lint
Dev: npm run dev

## Errores conocidos
[Quirks o problemas conocidos que el agente debe saber]

## Reglas especificas
[Convenciones del proyecto: naming, estructura de carpetas, etc.]

## Verificacion
[Como verificar cambios en ESTE proyecto especificamente]
```

---

### 8.5 .mcp.json — MCPs por proyecto

Cada proyecto tiene su propio `.mcp.json`. Esto define que MCPs tiene disponible el agente.

**Minimo recomendado para todos los proyectos:**

```json
{
  "mcpServers": {
    "knowledge-hub": {
      "command": "node",
      "args": ["/opt/knowledge-hub/src/mcp-server.js"],
      "env": {
        "PROJECT": "nombre-del-proyecto"
      }
    },
    "boris": {
      "command": "python3",
      "args": ["/opt/boris-mcp/server.py"],
      "env": {
        "PROJECT_PATH": "/ruta/absoluta/al/proyecto"
      }
    }
  }
}
```

**Para proyectos con frontend (agregar Chrome MCP):**

```json
{
  "mcpServers": {
    "knowledge-hub": { ... },
    "boris": { ... },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp", "--cdp-endpoint", "http://localhost:9222"]
    }
  }
}
```

**Para proyectos que necesitan acceso a CLIProxyAPI (Gemini/Perplexity):**

```json
{
  "mcpServers": {
    "knowledge-hub": { ... },
    "boris": { ... },
    "cliproxy": {
      "command": "npx",
      "args": ["-y", "supergateway", "--sse", "http://localhost:8317/sse"]
    }
  }
}
```

---

### 8.6 Estructura inicial de .brain/

Antes de que el agente empiece a trabajar, crear estos archivos:

```bash
mkdir -p .brain

cat > .brain/task.md << 'EOF'
## Tarea actual: ninguna — esperando primera tarea

## Progreso:
(sin progreso aun)

## Proximo paso:
Esperar instrucciones del SM via Knowledge Hub

## Archivos modificados:
ninguno
EOF

cat > .brain/session-state.md << 'EOF'
Ultima actualizacion: FECHA_DE_HOY
Fase: esperando
Branch: main
Ultimo commit: (ninguno aun)
Proxima accion: Leer CLAUDE.md y esperar tarea del SM
EOF

touch .brain/history.md
touch .brain/done-registry.md

git add .brain/
git commit -m "[BRAIN] setup inicial"
```

---

### 8.7 CLAUDE.md del proyecto — template

Este es el archivo principal que define el rol del arquitecto. Es lo primero que Claude lee al arrancar.

```markdown
# ARQUITECTO: [NOMBRE DEL PROYECTO]

## IDENTIDAD
Eres el ARQUITECTO de [nombre del proyecto].
Workspace: /ruta/al/proyecto

## PROTOCOLO DE INICIO
1. Lee este CLAUDE.md completo
2. Llama boris_get_state del MCP para ver el estado actual
3. Lee .brain/task.md para ver que habia pendiente
4. Si hay tarea pendiente: CONTINUA donde quedaste
5. Si no hay tarea: espera instrucciones del SM via Knowledge Hub

## HERRAMIENTAS DISPONIBLES
- boris: Verificacion, estado, memoria
- knowledge-hub: Comunicacion con el SM, guardar/leer informacion
- [otras herramientas segun el proyecto]

## REGLAS INQUEBRANTABLES
1. NUNCA hagas commit sin evidencia verificada (Boris lo bloquea de todas formas)
2. NUNCA pierdas estado — guarda con boris_save_state cada 15-20 min
3. NUNCA empieces de cero si pierdes contexto — lee .brain/ y continua
4. NUNCA toques archivos fuera de este proyecto

## STACK DEL PROYECTO
[Tecnologias, versiones, estructura de carpetas]

## COMANDOS IMPORTANTES
Build: [comando]
Test: [comando]
Dev: [comando]

## DEPLOY
[Como se despliega este proyecto]

## ERRORES CONOCIDOS
[Cosas que el agente debe saber para no perder tiempo]
```

---

### 8.8 Tabla comparativa: lo que debe ser IGUAL en todos los arquitectos

Esta tabla muestra que debe ser identico en todos los proyectos y que puede variar:

| Elemento | Igual en todos | Puede variar |
|----------|---------------|--------------|
| `.claude/rules/01-verificacion.md` | Contenido identico | No |
| `.claude/rules/02-memory-protocol.md` | Contenido identico | No |
| `.claude/rules/03-project-specific.md` | Formato identico | Contenido si |
| `.claude/settings.json` — hooks Boris | Identicos | No |
| `.claude/settings.json` — deny rules | Identicos | No |
| `.claude/settings.json` — bypassPermissions | Segun proyecto | Si |
| `.brain/task.md` | Formato identico | Contenido si |
| `.brain/session-state.md` | Formato identico | Contenido si |
| `.brain/history.md` | Formato identico | Contenido si |
| `.mcp.json` — knowledge-hub | Identico | Solo PROJECT env |
| `.mcp.json` — boris | Identico | Solo PROJECT_PATH |
| `CLAUDE.md` — protocolo de inicio | Identico | No |
| `CLAUDE.md` — stack y comandos | Diferente por proyecto | Si |
| Nombre sesion tmux | Igual al nombre del proyecto | Si |

**Regla simple:** Todo lo que es infraestructura (Boris, memoria, hooks) es identico. Todo lo que es contenido del proyecto (stack, comandos, errores conocidos) es especifico.

---

### 8.9 Ejemplo completo: configurar un arquitecto desde cero

Supongamos que hay un nuevo proyecto llamado `mi-ecommerce` en `/home/usuario/mi-ecommerce`.

**Paso 1: Preparar el repositorio**

```bash
cd /home/usuario/mi-ecommerce
git init  # si no es ya un repo git
mkdir -p .claude/hooks .claude/rules .brain
```

**Paso 2: Instalar Boris**

```bash
bash /ruta/al/install-boris.sh
# O manualmente crear los hooks (ver Parte 7)
```

**Paso 3: Crear las 3 reglas**

```bash
# Copiar desde otro proyecto existente (mas rapido):
cp /home/usuario/gestoriard/.claude/rules/01-verificacion.md .claude/rules/
cp /home/usuario/gestoriard/.claude/rules/02-memory-protocol.md .claude/rules/

# Crear la regla especifica del proyecto:
cat > .claude/rules/03-project-specific.md << 'EOF'
# REGLAS DEL PROYECTO -- MI-ECOMMERCE

## Arquitectura
Next.js 15 con App Router. PostgreSQL para datos. Stripe para pagos.

## Stack
Node.js 22, Next.js 15, PostgreSQL 16, Prisma ORM, Stripe SDK

## Comandos de desarrollo
Build: npm run build
Test: npm test
Dev: npm run dev
Lint: npm run lint

## Errores conocidos
- Prisma necesita 'npx prisma generate' despues de cambiar schema.prisma
- Variables de entorno: ver .env.example

## Verificacion
UI: Chrome MCP -> navegar localhost:3000 -> verificar visualmente
API: curl localhost:3000/api/... -> verificar status code
BD: npx prisma studio -> revisar datos
EOF
```

**Paso 4: Crear .mcp.json**

```bash
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "knowledge-hub": {
      "command": "node",
      "args": ["/opt/knowledge-hub/src/mcp-server.js"],
      "env": {
        "PROJECT": "mi-ecommerce"
      }
    },
    "boris": {
      "command": "python3",
      "args": ["/opt/boris-mcp/server.py"],
      "env": {
        "PROJECT_PATH": "/home/usuario/mi-ecommerce"
      }
    }
  }
}
EOF
```

**Paso 5: Crear CLAUDE.md**

```bash
cat > CLAUDE.md << 'EOF'
# ARQUITECTO: MI-ECOMMERCE

## IDENTIDAD
Eres el ARQUITECTO del proyecto mi-ecommerce.
Workspace: /home/usuario/mi-ecommerce
Stack: Next.js 15, PostgreSQL, Stripe

## PROTOCOLO DE INICIO
1. Lee este CLAUDE.md completo
2. Llama boris_get_state para ver estado actual
3. Lee .brain/task.md para ver pendientes
4. Si hay tarea pendiente: CONTINUA
5. Si no: espera instrucciones del SM

## REGLAS
- NUNCA commit sin boris_verify primero
- NUNCA tocar .env con credenciales reales
- NUNCA saltar esquema Prisma sin 'npx prisma generate'
- Guardad estado con boris_save_state cada 15-20 min

## COMANDOS
npm run dev     # servidor desarrollo en localhost:3000
npm run build   # verificar que compila
npm test        # tests con Jest
npx prisma studio  # ver base de datos
EOF
```

**Paso 6: Inicializar .brain/**

```bash
echo "## Tarea actual: ninguna — esperando primera tarea" > .brain/task.md
echo "Ultima actualizacion: $(date)" > .brain/session-state.md
touch .brain/history.md
touch .brain/done-registry.md
```

**Paso 7: Primer commit**

```bash
git add .claude/ .brain/ CLAUDE.md .mcp.json
git commit -m "[BRAIN] setup inicial arquitecto mi-ecommerce"
git push origin main
```

**Paso 8: Crear sesion tmux**

```bash
tmux new-session -d -s mi-ecommerce -c /home/usuario/mi-ecommerce
```

**Paso 9: Verificar que todo funciona**

```bash
# Conectarse a la sesion
tmux attach -t mi-ecommerce

# Claude deberia estar disponible o lanzarlo:
claude --continue

# Al arrancar Claude, debe mostrar el estado de Boris
# (hook session-start se ejecuta automaticamente)
```

El arquitecto de `mi-ecommerce` esta listo para recibir tareas del SM.

---

## PARTE 9: Instalar Sypnose Agent Dashboard (Codeman)

### 9.1 Que es Codeman

Codeman es el dashboard web desde donde gestionas todos tus arquitectos simultaneamente.

Sin Codeman, tienes que abrir una terminal SSH por cada proyecto, conectarte a cada sesion tmux manualmente, y no puedes ver el estado de todos de un vistazo.

Con Codeman:
- Ves todos los arquitectos en una sola pantalla
- Creas y matas sesiones con un click
- Ves el terminal de cada sesion en tiempo real (xterm.js)
- El dashboard muestra si cada agente esta WORKING (verde) o IDLE (amarillo)
- Maneja automaticamente los limites de contexto: cuando un agente llega a 110K tokens hace compact, a 140K hace clear
- Sin `--dangerously-skip-permissions` — las sesiones trabajan de forma segura

**Datos tecnicos:**
- Proyecto open source, MIT license, GitHub: `Ark0N/Codeman`
- Node.js, puerto 3000 en el servidor
- Acceso via tunel SSH (sypnose-tunnels MCP ya lo maneja)
- Soporta hasta 20 sesiones paralelas

---

### 9.2 Instalar en el servidor

**Paso 1: Clonar el repositorio**

```bash
ssh -p PUERTO_SSH USUARIO@IP_SERVIDOR

cd /opt
sudo git clone https://github.com/Ark0N/Codeman.git
cd Codeman
```

**Paso 2: Instalar dependencias**

```bash
sudo npm install
```

Si hay errores de permisos:

```bash
sudo chown -R USUARIO_SERVIDOR:USUARIO_SERVIDOR /opt/Codeman
npm install
```

**Paso 3: Configurar**

```bash
cp .env.example .env
```

Editar el archivo `.env`:

```bash
nano .env
```

Configuracion minima:

```
PORT=3000
NODE_ENV=production
DEFAULT_MODEL=claude-sonnet-4-5
MAX_SESSIONS=20
```

**Paso 4: Verificar que arranca**

```bash
npm start
# Debe mostrar algo como:
# Codeman running on http://localhost:3000
```

Verificar desde otra terminal:

```bash
curl -s http://localhost:3000 | head -10
# Debe devolver HTML de la pagina principal
```

Si funciona, parar con `Ctrl+C` y continuar con el servicio systemd.

---

### 9.3 Crear servicio systemd

El servicio systemd hace que Codeman arranque automaticamente cuando el servidor reinicia.

**Paso 1: Crear el archivo de servicio**

```bash
sudo nano /etc/systemd/system/codeman.service
```

Contenido (reemplazar USUARIO_SERVIDOR con tu usuario):

```ini
[Unit]
Description=Codeman Dashboard — Sypnose Agent Monitor
After=network.target

[Service]
Type=simple
User=USUARIO_SERVIDOR
WorkingDirectory=/opt/Codeman
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Paso 2: Activar y arrancar**

```bash
sudo systemctl daemon-reload
sudo systemctl enable codeman
sudo systemctl start codeman
```

**Paso 3: Verificar que esta corriendo**

```bash
sudo systemctl status codeman
# Debe mostrar: Active: active (running)

curl -s http://localhost:3000 | head -5
# Debe devolver HTML
```

**Paso 4: Bloquear acceso externo (OBLIGATORIO)**

Codeman NO debe ser accesible desde internet. Solo via tunel SSH.

```bash
# Denegar acceso al puerto 3000 desde internet
sudo ufw deny 3000
sudo ufw reload

# Verificar que solo responde en localhost
curl -s http://localhost:3000  # debe funcionar
curl -s http://IP_PUBLICA:3000  # debe fallar (timeout)
```

---

### 9.4 Configurar Codeman

Abrir Codeman en el navegador:

1. Asegurarse de que sypnose-tunnels MCP esta activo en Desktop Chat (ver Parte 6 del manual)
2. Abrir navegador en la PC
3. Ir a `http://localhost:3000`

Hacer click en el engranaje (arriba derecha) para abrir App Settings.

**Tab: Display**

| Setting | Valor | Por que |
|---------|-------|---------|
| System Stats | ON | Ver CPU y RAM del servidor en el header |
| Token Count | ON | Saber cuanto contexto usa cada agente |
| Show Cost ($) | ON | Controlar el gasto por sesion |
| Lifecycle Log | ON | Ver eventos importantes de las sesiones |
| Tall Tabs (Name + Folder) | ON | Identificar rapido que proyecto es cada tab |

**Tab: Claude CLI**

| Setting | Valor | Por que |
|---------|-------|---------|
| Startup Mode | Skip Permissions | Las sesiones trabajan sin interrupciones |
| Enable Ralph | OFF | Ralph se usa por separado si es necesario |
| Agent Teams | ON | Permite sub-agentes multi-archivo |
| Nice Priority Reduction | OFF | No bajar prioridad de CPU del servidor |

**Tab: Models**

| Setting | Valor | Por que |
|---------|-------|---------|
| Default Model | Sonnet (Balanced) | NUNCA Opus — demasiado caro para arquitectos |
| Optimizer Recommendations | ON | Acepta sugerencias de modelo |
| Explore Tasks | Use Default | Sonnet para investigar |
| Implement Tasks | Use Default | Sonnet para ejecutar |

**Tab: Paths**

| Setting | Valor |
|---------|-------|
| Default CLAUDE.MD Template | `/home/USUARIO/shared/CLAUDE.md` (si tienes uno compartido) |
| Default Working Directory | `/home/USUARIO` (home del usuario del servidor) |

**Tab: Notifications**

| Setting | Valor |
|---------|-------|
| Enable Notifications | ON |
| Browser | ON |
| Push | OFF (requiere HTTPS) |
| Audio Alerts | A gusto del usuario |
| Idle Threshold | 10 min |
| Critical / Warning / Info | Todos ON |

---

### 9.5 Conectar proyectos existentes

Si ya tienes proyectos con sus arquitectos configurados, conectarlos a Codeman:

**Para proyectos existentes (el caso mas comun):**

1. Click en `+` al lado del dropdown en la barra inferior de Codeman
2. Ir al tab `Link Existing`
3. Rellenar:
   - **CASE NAME:** nombre para Codeman (ej: `gestoriard`)
   - **FOLDER PATH:** ruta absoluta del proyecto (ej: `/home/usuario/gestoriard`)
4. Click `Link`
5. En el dropdown seleccionar `gestoriard`
6. Click `Run` — Codeman crea sesion tmux y lanza Claude Code en ese directorio
7. La primera vez Claude pregunta "trust this folder?" — escribir `1` y Enter

Repetir para cada proyecto.

**Para proyectos nuevos (desde Codeman):**

1. Click en `+` al lado del dropdown
2. Ir al tab `Create New`
3. Rellenar:
   - **CASE NAME:** nombre del proyecto nuevo
   - **DESCRIPTION:** opcional
4. Click `Create` — crea carpeta en `~/codeman-cases/nombre/`
5. Click `Run` — lanza Claude Code en la carpeta nueva

**IMPORTANTE:** Codeman solo monitorea sesiones que EL creo con el boton `Run`. Las sesiones tmux creadas manualmente con `tmux new-session` NO aparecen en el monitor de Codeman. Para tener todo unificado, crear todas las sesiones desde Codeman.

---

### 9.6 Acceso desde tu PC

**Si usas sypnose-tunnels MCP (recomendado):**

El tunel ya esta configurado. Solo abre `http://localhost:3000` en el navegador de tu PC. No necesitas nada mas.

**Si no usas sypnose-tunnels (alternativa manual):**

Abrir un tunel SSH manual antes de abrir el navegador:

```bash
# Windows PowerShell:
ssh -L 3000:localhost:3000 -p PUERTO_SSH USUARIO@IP_SERVIDOR -N

# Mac/Linux:
ssh -L 3000:localhost:3000 -p PUERTO_SSH USUARIO@IP_SERVIDOR -N &
```

Luego abrir `http://localhost:3000` en el navegador.

**Para acceso desde movil o compartir con alguien:**

```bash
# En el servidor:
cloudflared tunnel --url http://localhost:3000
# Genera una URL publica tipo https://xyz.trycloudflare.com
# ATENCION: Esta URL es temporal y expira. No es para uso permanente.
```

---

### 9.7 Branding Sypnose (colores Anthropic)

Para que Codeman tenga la identidad visual de Sypnose, personalizar el CSS.

**Paleta de colores Sypnose (basada en Anthropic):**

| Color | Hex | Uso |
|-------|-----|-----|
| Terra cotta | `#da7756` | Color principal, acentos, botones activos |
| Fondo claro | `#faf9f5` | Background principal |
| Oscuro | `#1a1a1a` | Background secundario, headers |
| Blanco roto | `#f5f0e8` | Cards, paneles |
| Verde estado | `#4caf50` | WORKING (agente activo) |
| Amarillo estado | `#ff9800` | IDLE (agente esperando) |

**Tipografia Sypnose:**
- Titulos: `Poppins` (Google Fonts)
- Cuerpo: `Lora` (Google Fonts)
- Codigo y terminal: `JetBrains Mono` o `DM Mono`

**Para aplicar el branding:**

Buscar el archivo CSS principal de Codeman:

```bash
find /opt/Codeman -name "*.css" | head -10
# O buscar en public/ o src/
```

Agregar al final del CSS principal:

```css
/* ===== SYPNOSE BRANDING ===== */

/* Importar fuentes */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Lora:wght@400;500&family=DM+Mono:wght@400;500&display=swap');

/* Variables de color */
:root {
  --sypnose-primary: #da7756;
  --sypnose-bg: #faf9f5;
  --sypnose-dark: #1a1a1a;
  --sypnose-card: #f5f0e8;
  --sypnose-working: #4caf50;
  --sypnose-idle: #ff9800;
}

/* Fondo principal */
body {
  background-color: var(--sypnose-dark) !important;
  font-family: 'Lora', serif;
}

/* Header / barra superior */
.header, nav, .navbar {
  background-color: #2a2a2a !important;
  border-bottom: 2px solid var(--sypnose-primary) !important;
  font-family: 'Poppins', sans-serif;
}

/* Botones principales */
button.primary, .btn-primary, [class*="run-btn"] {
  background-color: var(--sypnose-primary) !important;
  border-color: var(--sypnose-primary) !important;
}

button.primary:hover {
  background-color: #c4674a !important;
}

/* Estado WORKING */
[class*="working"], .status-working {
  color: var(--sypnose-working) !important;
}

/* Estado IDLE */
[class*="idle"], .status-idle {
  color: var(--sypnose-idle) !important;
}

/* Terminal (xterm.js) */
.xterm {
  font-family: 'DM Mono', 'JetBrains Mono', monospace !important;
  font-size: 13px !important;
}

/* Cards y paneles */
.card, .panel, [class*="session-card"] {
  background-color: #2a2a2a !important;
  border: 1px solid #3a3a3a !important;
  border-radius: 8px !important;
}

/* Titulos */
h1, h2, h3 {
  font-family: 'Poppins', sans-serif !important;
  color: var(--sypnose-primary) !important;
}
```

NOTA: La estructura exacta de clases CSS puede variar segun la version de Codeman. Si las clases no coinciden, inspeccionar el HTML del dashboard con las DevTools del navegador (F12) para encontrar los selectores correctos.

---

### 9.8 Monitor de sesiones

El panel de la derecha en Codeman es el Monitor. Desde aqui ves y controlas todas las sesiones.

**Como leer el monitor:**

```
TMUX SESSIONS
─────────────────────────────────────
w1-gestoriard     WORKING  ████ 45K tokens
w1-iatrader       IDLE     ░░░░ 12K tokens
w1-facturaia      WORKING  ██░░ 78K tokens
─────────────────────────────────────
[Kill] [Kill All]

BACKGROUND AGENTS
─────────────────────────────────────
gestoriard > subagente-1  running
gestoriard > subagente-2  completed
─────────────────────────────────────
```

**Significado de los estados:**
- `WORKING` (verde) — Claude esta ejecutando algo activamente
- `IDLE` (amarillo) — Claude espera input o una nueva tarea
- El contador de tokens indica cuanto contexto se ha consumido

**Limite de tokens:**
- A 110K tokens: Codeman lanza compact automaticamente (comprime el contexto, el agente continua)
- A 140K tokens: Codeman hace clear (reinicia el contexto, Boris session-start recupera el estado)

**Controles:**
- Click en un tab (arriba) → ver el terminal de esa sesion en tiempo real
- `Kill` en una sesion → mata solo esa sesion
- `Kill All` → mata todas las sesiones (usar solo en emergencias)
- Click en `Codeman` (arriba izquierda) → volver al home

**Ver el terminal de un agente:**

Click en el tab del agente (arriba). Se abre el terminal xterm.js con la salida en tiempo real. Puedes escribir directamente si necesitas dar un input manual.

**Enviar comando a una sesion sin abrir Codeman:**

Desde la terminal del servidor:

```bash
# Ver que sesiones existen
tmux list-sessions

# Enviar texto a una sesion (como si lo escribiera el usuario)
tmux send-keys -t w1-gestoriard "revisa el estado actual" Enter
```

NOTA: Los nombres de sesion en Codeman siguen el patron `w1-nombre-del-caso`. Si creaste el caso como `gestoriard`, la sesion tmux se llama `w1-gestoriard`.

---

### 9.9 Que puede salir mal

**Problema: Codeman no arranca — "EADDRINUSE" puerto 3000**

Causa: Otro proceso ya usa el puerto 3000.

Solucion:
```bash
# Ver que proceso usa el puerto
sudo lsof -i :3000
# O en sistemas sin lsof:
sudo ss -tlnp | grep 3000

# Matar el proceso (reemplaza PID con el numero que aparece)
sudo kill -9 PID

# Reiniciar Codeman
sudo systemctl restart codeman
```

---

**Problema: Codeman no aparece en localhost:3000 desde la PC**

Causa: El tunel SSH no esta activo o sypnose-tunnels MCP no esta funcionando.

Solucion:
1. En Desktop Chat, preguntar: "cual es el estado de los tuneles?"
2. Si algun tunel no esta conectado, decir: "reconecta los tuneles"
3. Si los tuneles estan conectados pero el servicio no responde, verificar en el servidor:
```bash
sudo systemctl status codeman
curl -s http://localhost:3000 | head -3
```

---

**Problema: Las sesiones de tmux no aparecen en el monitor**

Causa: Esas sesiones fueron creadas manualmente con `tmux new-session`, no con el boton `Run` de Codeman.

Solucion: Codeman solo monitorea sesiones que el creo. Para las sesiones manuales existentes, opciones:
1. Matar la sesion manual y recrearla desde Codeman (click `+` → `Link Existing` → `Run`)
2. Aceptar que esas sesiones no apareceran en el monitor y manejarlas por terminal

---

**Problema: npm install falla con errores de permisos**

Causa: El directorio `/opt/Codeman` pertenece a root pero estas ejecutando npm como otro usuario.

Solucion:
```bash
sudo chown -R $(whoami):$(whoami) /opt/Codeman
cd /opt/Codeman
npm install
```

---

**Problema: Codeman muestra el agente como IDLE pero esta trabajando**

Causa: Codeman detecta actividad basandose en la salida del terminal. Si Claude esta procesando internamente sin producir output visible, puede aparecer como IDLE.

Solucion: Es un falso positivo. Click en el tab del agente y ver el terminal para confirmar el estado real.

---

**Problema: El CSS de branding no se aplica correctamente**

Causa: Los selectores CSS no coinciden con la version de Codeman instalada.

Solucion: Abrir el navegador en `http://localhost:3000`, presionar F12 (DevTools), inspeccionar el elemento que quieres cambiar, y encontrar el selector exacto de esa version. Actualizar el CSS con el selector correcto.

---

**Problema: El servicio systemd falla al arrancar despues de reinicio**

Causa: Codeman intenta arrancar antes de que la red este disponible, o Node.js no esta en el PATH del servicio.

Solucion: Editar el servicio para incluir la ruta completa de node y agregar dependencias de red:

```bash
sudo nano /etc/systemd/system/codeman.service
```

Cambiar `ExecStart`:
```ini
ExecStart=/usr/bin/node /opt/Codeman/server.js
```

O agregar la variable de entorno PATH:
```ini
Environment=PATH=/usr/local/bin:/usr/bin:/bin
```

Luego:
```bash
sudo systemctl daemon-reload
sudo systemctl restart codeman
```

---

**Problema: El agente hace compact y pierde el estado**

Este NO es un problema de Codeman — es por eso que Boris existe. El hook `boris-session-start.sh` se ejecuta automaticamente despues de un compact y restaura el estado desde `.brain/`. Si esto no funciona, verificar que el hook esta registrado correctamente en `.claude/settings.json`.

---

*Fin de las Partes 7, 8 y 9.*


---

# SYPNOSE — Parte 10: OpenClaw y Apéndices

---

## TABLA DE CONTENIDOS

- [Parte 10: Instalar y Configurar OpenClaw (Supervisor)](#parte-10)
- [Apéndice A: Matriz de Modelos](#apendice-a)
- [Apéndice B: SypnoseProxy (antes CLIProxy)](#apendice-b)
- [Apéndice C: Troubleshooting Común](#apendice-c)
- [Apéndice D: Checklist Post-Instalación](#apendice-d)
- [Apéndice E: Security Hardening](#apendice-e)
- [Apéndice F: Comandos Útiles del Día a Día](#apendice-f)

---

<a name="parte-10"></a>
# PARTE 10: Instalar y Configurar OpenClaw (Supervisor)

## ¿Qué es OpenClaw?

OpenClaw es el **supervisor 24/7** del sistema Sypnose. Mientras los arquitectos
trabajan y el SM coordina, OpenClaw observa en silencio y alerta cuando algo sale
mal.

Metáfora práctica: el SM es el jefe de obra, los arquitectos son los obreros, y
OpenClaw es el inspector de seguridad que está siempre presente aunque nadie lo
llame.

### Qué audita OpenClaw

| Categoría | Qué verifica |
|---|---|
| Boris compliance | Que los commits tengan verificación aprobada |
| Calidad de trabajo | Que `.brain/task.md` tenga contenido real (>120 palabras) |
| Seguridad | Que no se filtren credenciales, IPs, .env en commits |
| Deploys | Que haya backup Docker antes de cada swap |
| Arquitectos activos | Que ninguna sesión tmux lleve >30 min sin actualizar estado |
| Knowledge Hub | Que las notificaciones KB sean procesadas |
| Identity loop | Que el SM recuerde quién es en sesiones largas |

OpenClaw no bloquea. Alerta via Telegram y anota en KB. El bloqueo lo hacen los
hooks Boris — OpenClaw es la segunda línea de defensa.

---

## 10.1 — Instalación

### Requisitos previos
- Node.js v22+ instalado en el servidor
- tmux instalado
- Cuenta de Telegram (para alertas)
- Knowledge Hub corriendo en puerto 18791

### Instalar el paquete

```bash
npm install -g openclaw
openclaw --version
# Debe mostrar 2026.x.x
```

### Inicializar en el workspace

OpenClaw necesita un directorio de workspace donde guarda su estado, memoria y
logs de auditoría.

```bash
# Crear el workspace
mkdir -p ~/.openclaw/workspace

# Inicializar
openclaw init
# Te pregunta:
#   - Nombre de este agente (ej: "main", "gestoriard", "iatrader")
#   - Puerto del Knowledge Hub (default: 18791)
#   - Token de Telegram (ver sección 10.3)
#   - Chat ID de Telegram (ver sección 10.3)
```

Esto crea:
```
~/.openclaw/
├── openclaw.json          ← Configuración principal
└── workspace/
    ├── SOUL.md            ← Identidad del supervisor (ver sección 10.5)
    └── HEARTBEAT.md       ← Log de latidos (se actualiza cada ciclo)
```

### Verificar instalación

```bash
openclaw status
# Debe mostrar: Agent: main | KB: connected | Telegram: configured
```

---

## 10.2 — Configurar con modelos gratuitos

OpenClaw usa modelos de IA para analizar el trabajo de los arquitectos. La regla
de Sypnose es clara: **usar modelos gratuitos siempre que sea posible**.

OpenClaw soporta cualquier endpoint compatible con OpenAI. Apuntar a SypnoseProxy
(puerto 8317) para acceder a modelos gratuitos.

### Editar openclaw.json

```bash
nano ~/.openclaw/openclaw.json
```

Configuración recomendada:

```json
{
  "agent": "main",
  "gateway": "ws://127.0.0.1:18789",
  "kb_url": "http://127.0.0.1:18791",
  "model": "cliproxy/gemini-2.5-flash",
  "model_url": "http://127.0.0.1:8317/v1",
  "audit_model": "cliproxy/qwen-3-coder-plus",
  "audit_model_url": "http://127.0.0.1:8317/v1",
  "telegram": {
    "bot_token": "TU_BOT_TOKEN_AQUI",
    "chat_id": "TU_CHAT_ID_AQUI"
  },
  "workspace": "~/.openclaw/workspace",
  "audit_interval_minutes": 30,
  "projects": [
    "/home/gestoria/gestion-contadoresrd",
    "/home/gestoria/IATRADER",
    "/home/gestoria/eas-builds/FacturaScannerApp"
  ]
}
```

### Modelos recomendados para OpenClaw

| Uso | Modelo | Por qué |
|---|---|---|
| Análisis general | `cliproxy/gemini-2.5-flash` | Rápido, gratis, buen contexto |
| Auditoría código | `cliproxy/qwen-3-coder-plus` | Especializado en código |
| Análisis pesado | `cliproxy/gemini-2.5-pro` | Más profundo, usar con moderación |

**Regla:** Nunca configurar Claude Opus en OpenClaw. Opus es solo para el SM
cuando toma decisiones estratégicas. OpenClaw hace trabajo de auditoría repetitivo.

---

## 10.3 — Configurar alertas Telegram

Las alertas Telegram son la forma en que OpenClaw te avisa cuando algo requiere
atención sin que tengas que estar mirando logs.

### Crear el bot de Telegram

1. Abre Telegram, busca `@BotFather`
2. Escribe `/newbot`
3. Dale un nombre (ej: "Sypnose Supervisor")
4. Dale un username (ej: `sypnose_main_bot`)
5. BotFather te da el **token** — guárdalo. Formato: `123456789:ABCdef...`

### Obtener tu Chat ID

1. Abre Telegram, busca el bot que acabas de crear
2. Escribe cualquier mensaje (ej: "hola")
3. Ejecuta en el servidor:

```bash
curl -s "https://api.telegram.org/bot<TU_TOKEN>/getUpdates" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); \
  print(d['result'][0]['message']['chat']['id'])"
```

Ese número es tu **chat_id**.

### Configurar en openclaw.json

```json
"telegram": {
  "bot_token": "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ",
  "chat_id": "5358902915"
}
```

### Tipos de alertas que recibirás

| Alerta | Qué significa | Urgencia |
|---|---|---|
| `[BORIS] commit sin verificación` | Arquitecto intentó hacer commit sin evidencia | ALTA |
| `[CALIDAD] task.md vacío 30+ min` | Sesión activa sin actualizar estado | MEDIA |
| `[SEGURIDAD] posible filtración` | .env o credencial en staged files | ALTA |
| `[KB] notificación sin leer 1h+` | SM no procesó aviso del arquitecto | MEDIA |
| `[HEARTBEAT] arquitecto inactivo` | Sesión tmux sin actividad | BAJA |
| `[DEPLOY] sin backup Docker` | Intento de deploy sin imagen de respaldo | ALTA |

### Probar que Telegram funciona

```bash
openclaw test-telegram
# Debes recibir: "OpenClaw online. Sistema Sypnose activo."
```

---

## 10.4 — Skills de seguridad: SecureClaw y ClawSecure

OpenClaw incluye dos skills especializados en seguridad que se instalan
automáticamente con el paquete.

### SecureClaw — Auditoría de código antes de commit

SecureClaw se ejecuta como hook PreToolUse y escanea los staged files antes
de que el arquitecto haga commit. Busca:

- Tokens y API keys hardcodeados (patrones como `sk-`, `Bearer `, `ghp_`, etc.)
- Archivos `.env` incluidos accidentalmente en el commit
- IPs internas o credenciales de base de datos
- Strings que parecen contraseñas (mínimo 12 chars con números + letras + símbolos)

**Instalar SecureClaw en un proyecto:**

```bash
cd /home/gestoria/mi-proyecto
openclaw secure init

# Esto añade a .claude/hooks/:
# - secureclaw-prescan.sh (ejecuta antes de cada commit)
# Configura en .claude/settings.json como hook PreToolUse
```

Verificar que se instaló:

```bash
ls .claude/hooks/
# Debe mostrar: boris-verification-gate.sh  secureclaw-prescan.sh
```

### ClawSecure — Auditoría de deploys

ClawSecure monitorea los deploys Docker y bloquea si no existe imagen de backup.

```bash
# Instalar globalmente
openclaw clawsecure install

# Configurar en el proyecto
cd /home/gestoria/mi-proyecto
openclaw clawsecure configure \
  --container gestoriard \
  --backup-prefix gestoriard-backup

# Ahora antes de cada docker restart/stop/rm
# ClawSecure verifica que existe: gestoriard-backup-FECHA
```

Si el backup no existe, ClawSecure envía alerta Telegram y cancela la operación.

---

## 10.5 — SOUL.md: la identidad del supervisor

SOUL.md es el archivo que define quién es OpenClaw — su propósito, sus límites
y sus valores. OpenClaw lo lee al iniciar cada ciclo de auditoría para no perder
su identidad en sesiones largas.

Ruta: `~/.openclaw/workspace/SOUL.md`

### Contenido estándar de SOUL.md

```markdown
# SOUL — OpenClaw Supervisor

## Quién soy
Soy el supervisor de calidad del sistema Sypnose.
Mi trabajo es observar, no ejecutar.
Alerto cuando algo sale mal. No tomo decisiones por nadie.

## Mis valores
1. La seguridad primero — antes que la velocidad
2. Calidad verificable — evidencia o no cuenta
3. No interrumpir el flujo — alertas precisas, no spam

## Lo que NO hago
- No ejecuto código en los proyectos
- No envío tareas a los arquitectos
- No tomo decisiones de arquitectura
- No cancelo deploys (solo alerto — Boris los bloquea)

## Mi ciclo
Cada 30 minutos reviso:
- Estado KB (notificaciones pendientes)
- Sesiones tmux activas (task.md actualizado?)
- Git status de proyectos (commits pendientes sin verificar)
- Docker (containers healthy?)

## A quién reporto
- Carlos De La Torre via Telegram
- Knowledge Hub (key: openclaw-audit-FECHA)
```

Puedes personalizar SOUL.md para tu sistema. Lo importante es mantener la sección
"Lo que NO hago" — define los límites del supervisor.

---

## 10.6 — Crons de auditoría

OpenClaw tiene su propio scheduler interno, pero también puedes configurar
crons del sistema para tareas específicas.

### Iniciar OpenClaw como servicio (recomendado)

```bash
sudo cat > /etc/systemd/system/openclaw.service << 'EOF'
[Unit]
Description=OpenClaw Supervisor — Sypnose
After=network.target knowledge-hub.service

[Service]
Type=simple
User=gestoria
WorkingDirectory=/home/gestoria
ExecStart=/usr/bin/openclaw watch
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable openclaw
sudo systemctl start openclaw

# Verificar que arrancó
sudo systemctl status openclaw
```

### Crons complementarios (crontab)

```bash
crontab -e
```

Agregar estas líneas:

```cron
# Auditoría completa de seguridad — cada 6 horas
0 */6 * * * /usr/bin/openclaw audit security >> /var/log/openclaw-security.log 2>&1

# Reporte diario de actividad — 8 AM hora del servidor
0 8 * * * /usr/bin/openclaw report daily | /usr/bin/openclaw telegram-send

# Verificar que KB sigue corriendo — cada 5 minutos
*/5 * * * * /usr/bin/curl -s http://localhost:18791/health > /dev/null || \
  /usr/bin/openclaw alert "KB caído — reiniciar knowledge-hub.service"

# Limpieza de logs viejos — cada domingo medianoche
0 0 * * 0 find /var/log/ -name "openclaw-*.log" -mtime +30 -delete
```

---

## 10.7 — Puerto gateway: 18789

OpenClaw usa el puerto **18789** como gateway WebSocket para comunicarse con los
arquitectos en tiempo real. Este puerto es diferente al Knowledge Hub (18791).

| Puerto | Servicio | Protocolo |
|---|---|---|
| 18789 | OpenClaw Gateway | WebSocket (ws://) |
| 18790 | OpenClaw Control UI | HTTP (http://) |
| 18791 | Knowledge Hub API | HTTP (http://) |
| 18793 | Knowledge Hub SSE | HTTP/SSE (http://) |
| 8317 | SypnoseProxy | HTTP (http://) |

### Acceder al Control UI

```bash
# Desde el servidor
curl http://127.0.0.1:18790/chat?session=main

# Desde la PC (si túneles SSH activos)
# Abrir navegador: http://localhost:18790/chat?session=main
```

El Control UI permite ver el estado del supervisor, los últimos audits y
enviar comandos manuales.

### Agregar al sypnose-tunnels

Para acceder al Control UI desde la PC, agregar al `TUNNEL_PORTS` del MCP
sypnose-tunnels (ver Parte 5 del manual):

```javascript
{ local: 18790, remote: 18790, name: 'openclaw-ui' },
{ local: 18789, remote: 18789, name: 'openclaw-gateway' },
```

---

## 10.8 — Qué puede salir mal

Esta sección recoge los problemas más frecuentes con OpenClaw y cómo resolverlos.

### OpenClaw no arranca

**Síntoma:** `openclaw watch` falla o el servicio systemd queda en estado Failed.

**Causas y soluciones:**

```bash
# Ver el error real
sudo journalctl -u openclaw -n 50

# Causa 1: Knowledge Hub no está corriendo
curl http://localhost:18791/health
# Si no responde: sudo systemctl start knowledge-hub

# Causa 2: Puerto 18789 ocupado
ss -tlnp | grep 18789
# Si hay algo: kill ese proceso primero

# Causa 3: Configuración inválida en openclaw.json
openclaw validate-config
# Muestra los errores de configuración

# Causa 4: Node.js versión incorrecta
node --version
# Debe ser v22+. Si no: nvm use 22
```

### Telegram no envía alertas

```bash
# Verificar token
curl "https://api.telegram.org/bot<TOKEN>/getMe"
# Debe responder con info del bot

# Verificar chat_id
openclaw test-telegram
# Si falla: el chat_id está mal o bloqueaste el bot

# El bot debe haber recibido al menos UN mensaje tuyo primero
# Si nunca le escribiste al bot → escríbele "hola" en Telegram → reintenta
```

### OpenClaw alerta demasiado (spam)

```bash
# Ajustar el umbral de auditoría
nano ~/.openclaw/openclaw.json

# Cambiar audit_interval_minutes a un valor mayor (ej: 60)
# O desactivar alertas específicas:
"alerts": {
  "heartbeat_inactive": false,
  "kb_unread_minutes": 120
}
```

### OpenClaw no detecta los proyectos

```bash
# Verificar que los paths en openclaw.json existen
ls /home/gestoria/gestion-contadoresrd
ls /home/gestoria/IATRADER

# Si un proyecto cambió de path, actualizar openclaw.json y reiniciar
sudo systemctl restart openclaw
```

### SecureClaw bloquea un commit legítimo

Si SecureClaw detecta un falso positivo (ej: un ejemplo de código con un token de prueba):

```bash
# Opción 1: Agregar excepción al archivo
# Al inicio del archivo, agregar comentario:
# openclaw-ignore: token-like-string

# Opción 2: Skip puntual (usar con cuidado)
git commit --no-verify -m "feat: ..."
# NOTA: Si usas --no-verify, documenta por qué en el mensaje del commit

# Opción 3: Ajustar patterns en SecureClaw
openclaw secure config --add-ignore "test_token_"
```

### OpenClaw se queda dormido (no audita)

OpenClaw tiene un heartbeat interno. Si el proceso se cuelga sin morir:

```bash
# Verificar que el proceso sigue vivo pero congelado
ps aux | grep openclaw

# Forzar reinicio
sudo systemctl restart openclaw

# Ver si hay error de memoria
sudo journalctl -u openclaw --since "1 hour ago" | grep -i "memory\|heap\|oom"
# Si hay OOM → el servidor necesita más RAM o ajustar Node.js max-old-space:
# ExecStart=/usr/bin/node --max-old-space-size=256 /usr/bin/openclaw watch
```

---

<a name="apendice-a"></a>
# APÉNDICE A: Matriz de Modelos

## Regla fundamental de Sypnose

**80% del trabajo debe usar modelos gratuitos.**
Claude Opus es solo para el SM cuando toma decisiones estratégicas complejas.
Los arquitectos siempre usan Sonnet. Los sub-agentes y análisis automáticos usan
modelos gratuitos vía SypnoseProxy.

## Tabla completa de modelos disponibles

| Modelo | Provider | Costo | Usar para |
|---|---|---|---|
| `claude-opus-4-5` | Anthropic | Alto (Max plan) | SM: decisiones estratégicas, análisis complejo |
| `claude-sonnet-4-5` | Anthropic | Medio (Max plan) | Arquitectos principales, features críticas |
| `claude-haiku-4-5` | Anthropic | Bajo (Max plan) | Sub-agentes rápidos, resúmenes, validaciones simples |
| `claude-opus-4` | Anthropic | Alto (Max plan) | SM: solo cuando Opus 4.5 no esté disponible |
| `claude-sonnet-4` | Anthropic | Medio (Max plan) | Respaldo de Sonnet 4.5 |
| `gemini-2.5-pro` | Google (gratis*) | Gratis via SypnoseProxy | Análisis de docs largos >500 líneas, contexto 1M |
| `gemini-2.5-flash` | Google (gratis*) | Gratis via SypnoseProxy | Análisis general, OpenClaw, auditorías |
| `gemini-2.0-flash` | Google (gratis*) | Gratis via SypnoseProxy | Tareas batch, análisis de imágenes |
| `deepseek-v3-2503` | DeepSeek (gratis*) | Gratis via SypnoseProxy | Código, refactoring, análisis técnico |
| `deepseek-r1` | DeepSeek (gratis*) | Gratis via SypnoseProxy | Razonamiento complejo, debugging difícil |
| `qwen-3-coder-plus` | Alibaba (gratis*) | Gratis via SypnoseProxy | Código, auditorías SecureClaw, revisiones |
| `qwen-2.5-coder-32b` | Alibaba (gratis*) | Gratis via SypnoseProxy | Código especializado, refactoring masivo |
| `qwen-2.5-72b` | Alibaba (gratis*) | Gratis via SypnoseProxy | Análisis general, documentación |
| `gpt-4o` | OpenAI | Bajo-Medio | Cuando necesitas perspectiva de otro proveedor |
| `gpt-4o-mini` | OpenAI | Muy bajo | Validaciones, clasificaciones simples |
| `o3-mini` | OpenAI | Medio | Razonamiento matemático, lógica |
| `llama-3.3-70b` | Meta (gratis*) | Gratis via SypnoseProxy | Tareas generales, alternativa libre |
| `mistral-large` | Mistral (gratis*) | Gratis via SypnoseProxy | Texto en español/francés, documentación |
| `perplexity-sonar-pro` | Perplexity | Bajo | Búsquedas web, investigación, docs actualizadas |
| `perplexity-sonar` | Perplexity | Muy bajo | Búsquedas rápidas, hechos puntuales |

*Gratis dentro de los límites de uso gratuito de cada API. SypnoseProxy rota entre
providers cuando se agotan los límites.

## Guía rápida: ¿qué modelo usar?

```
¿Quién eres?
├── SM (Desktop Chat)
│   ├── Decisión estratégica importante → claude-opus-4-5
│   ├── Tarea normal de coordinación → claude-sonnet-4-5
│   └── Resumen rápido → claude-haiku-4-5
│
├── Arquitecto (Claude Code CLI)
│   ├── Feature principal → claude-sonnet-4-5
│   └── Sub-agentes del equipo → claude-sonnet-4-5 (NUNCA opus)
│
└── Análisis/Herramientas automáticas
    ├── Documento largo (>500 líneas) → gemini-2.5-pro
    ├── Análisis de código → qwen-3-coder-plus o deepseek-v3
    ├── Investigación web → perplexity-sonar-pro
    └── Auditorías (OpenClaw) → gemini-2.5-flash
```

## Cómo usar modelos gratuitos en Claude Code

Dentro de una sesión de arquitecto, para llamar a Gemini o Perplexity:

```bash
# Gemini (análisis de archivos grandes)
curl -s http://localhost:8317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Analiza este código..."}]
  }' | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])"

# Perplexity (búsqueda web)
curl -s http://localhost:8317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar-pro",
    "messages": [{"role": "user", "content": "¿Última versión de Next.js?"}]
  }' | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])"
```

---

<a name="apendice-b"></a>
# APÉNDICE B: SypnoseProxy (antes CLIProxy)

## ¿Qué es SypnoseProxy?

SypnoseProxy es un router escrito en Go que expone **un solo endpoint HTTP**
compatible con la API de OpenAI, y por detrás enruta las peticiones a 6+
providers y 24+ modelos distintos.

Antes se llamaba CLIProxyAPI. Fue renombrado a SypnoseProxy en Mar-2026 para
reflejar que es parte de la infraestructura Sypnose.

### Por qué existe

Sin SypnoseProxy, cada herramienta necesita su propia configuración de API:
- OpenClaw → URL de Gemini
- Scripts bash → URL de Perplexity
- Agentes → URL de DeepSeek
- etc.

Con SypnoseProxy, todo apunta a `http://localhost:8317` y el proxy decide
qué backend usar según el modelo pedido. Un cambio de key o de provider
se hace en un solo lugar.

## Arquitectura

```
Petición → localhost:8317 → SypnoseProxy (Go)
                              ├── model: gemini-*      → Google AI API
                              ├── model: sonar-*       → Perplexity API
                              ├── model: deepseek-*    → DeepSeek API
                              ├── model: qwen-*        → Alibaba API
                              ├── model: gpt-*         → OpenAI API
                              ├── model: llama-*       → Groq/Together API
                              └── model: cliproxy/*    → Routing especial (gratis primero)
```

El prefijo `cliproxy/` es un alias especial que SypnoseProxy resuelve buscando
en todos los providers gratuitos disponibles, evitando los de pago si hay
capacidad gratuita.

## Puerto

SypnoseProxy escucha en el puerto **8317** del servidor.

Desde la PC (con túneles SSH activos): `http://localhost:8317`
Desde el servidor: `http://127.0.0.1:8317`

## Cómo configurar providers

El archivo de configuración de SypnoseProxy está en:

```
~/sypnose-proxy/config.json
```

o en el directorio donde esté instalado el binario.

```json
{
  "port": 8317,
  "providers": {
    "google": {
      "api_key": "AIza...",
      "base_url": "https://generativelanguage.googleapis.com/v1beta/openai"
    },
    "perplexity": {
      "api_key": "pplx-...",
      "base_url": "https://api.perplexity.ai"
    },
    "deepseek": {
      "api_key": "sk-...",
      "base_url": "https://api.deepseek.com"
    },
    "openai": {
      "api_key": "sk-...",
      "base_url": "https://api.openai.com/v1"
    },
    "alibaba": {
      "api_key": "sk-...",
      "base_url": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    },
    "groq": {
      "api_key": "gsk_...",
      "base_url": "https://api.groq.com/openai/v1"
    }
  },
  "model_routing": {
    "gemini-2.5-pro": "google",
    "gemini-2.5-flash": "google",
    "gemini-2.0-flash": "google",
    "sonar-pro": "perplexity",
    "sonar": "perplexity",
    "deepseek-v3-2503": "deepseek",
    "deepseek-r1": "deepseek",
    "qwen-3-coder-plus": "alibaba",
    "qwen-2.5-coder-32b": "alibaba",
    "llama-3.3-70b": "groq",
    "gpt-4o": "openai",
    "gpt-4o-mini": "openai"
  }
}
```

## Ejemplos de uso con curl

### Llamada básica a Gemini Flash

```bash
curl -s http://localhost:8317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "user", "content": "¿Cuántos días tiene un año bisiesto?"}
    ]
  }' | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(r['choices'][0]['message']['content'])
"
```

### Búsqueda web con Perplexity

```bash
curl -s http://localhost:8317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar-pro",
    "messages": [
      {"role": "user", "content": "Últimas novedades de Claude Code en 2025"}
    ]
  }' | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(r['choices'][0]['message']['content'])
"
```

### Análisis de código con DeepSeek

```bash
curl -s http://localhost:8317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-v3-2503",
    "messages": [
      {"role": "system", "content": "Eres un experto en código Python."},
      {"role": "user", "content": "Revisa este código y sugiere mejoras: def f(x): return x*x"}
    ]
  }' | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(r['choices'][0]['message']['content'])
"
```

### Script helper para los arquitectos

Guardar en `~/scripts/ask-gemini.sh`:

```bash
#!/bin/bash
# Uso: ask-gemini.sh "tu pregunta aquí"
QUESTION="$1"
MODEL="${2:-gemini-2.5-flash}"

curl -s http://localhost:8317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": $(echo "$QUESTION" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')}]
  }" | python3 -c "
import sys, json
r = json.load(sys.stdin)
print(r['choices'][0]['message']['content'])
"
```

```bash
chmod +x ~/scripts/ask-gemini.sh

# Uso:
~/scripts/ask-gemini.sh "¿Cómo funciona docker compose?"
~/scripts/ask-gemini.sh "Analiza este log de error: ..." gemini-2.5-pro
```

## Verificar que SypnoseProxy está corriendo

```bash
curl -s http://localhost:8317/health
# Debe responder: {"status": "ok", "providers": 6, "models": 24}

# Si no responde:
ps aux | grep sypnose-proxy
# Si no hay proceso, reiniciar:
cd ~/sypnose-proxy && ./sypnose-proxy &
# O via systemd:
sudo systemctl start sypnose-proxy
```

---

<a name="apendice-c"></a>
# APÉNDICE C: Troubleshooting Común

Una colección de problemas frecuentes y sus soluciones exactas. Organizados
de más a menos urgente.

---

### CRITICO: Memory leak en Claude Code v2.1.72 y v2.1.73

**Síntoma:** El servidor consume 30 GB de RAM por hora. El proceso `claude`
aparece con uso de memoria escalando sin parar en `top` o `htop`.

**Causa:** Las versiones v2.1.72 y v2.1.73 tienen un bug conocido de memory leak.

**Solución inmediata:**

```bash
# 1. Identificar el proceso
ps aux | grep claude | grep -v grep

# 2. Matar el proceso (NO el servidor, solo claude)
pkill -f "claude --continue"

# 3. Verificar versión instalada
claude --version

# 4. Si es 2.1.72 o 2.1.73, hacer downgrade
npm install -g @anthropic-ai/claude-code@2.1.52

# 5. Bloquear auto-update para que no vuelva a actualizarse
echo 'export CLAUDE_CODE_DISABLE_AUTOUPDATE=1' >> ~/.bashrc
source ~/.bashrc

# 6. Verificar que la versión correcta está activa
claude --version
# Debe mostrar: 2.1.52 (o inferior)
```

**Prevención:** La variable `CLAUDE_CODE_DISABLE_AUTOUPDATE=1` debe estar en
el `.bashrc` del servidor SIEMPRE. Verificar al instalar.

---

### tmux muestra barra amarilla "(search down)"

**Síntoma:** La barra de estado inferior de tmux aparece en amarillo con el
texto `(search down)` o `(search up)`. El teclado no funciona normalmente.

**Causa:** Se activó accidentalmente el modo búsqueda de tmux con Ctrl+R o
una combinación similar.

**Solución:**

```bash
# Presionar Escape
# Si no funciona, presionar q
# Si tampoco funciona, presionar Ctrl+C

# Verificar que saliste del modo búsqueda
# La barra debe volver a ser verde/normal
```

**Nota:** Esto es especialmente común cuando el arquitecto está escribiendo
comandos largos y presiona Ctrl+R intentando buscar en el historial de bash.
tmux intercepta el Ctrl+R.

---

### Knowledge Hub no responde

**Síntoma:** `kb_list`, `kb_read` o cualquier herramienta KB devuelve error
de conexión. Los arquitectos no pueden leer ni escribir en la memoria compartida.

**Diagnóstico:**

```bash
# 1. Verificar si el proceso KB corre
sudo systemctl status knowledge-hub
ps aux | grep knowledge-hub

# 2. Verificar que el puerto responde
curl http://localhost:18791/health

# 3. Ver logs de error
sudo journalctl -u knowledge-hub -n 100
```

**Soluciones según causa:**

```bash
# Causa A: Servicio caído → reiniciar
sudo systemctl restart knowledge-hub

# Causa B: Puerto ocupado por otro proceso
ss -tlnp | grep 18791
kill <PID del proceso que ocupa el puerto>
sudo systemctl start knowledge-hub

# Causa C: Base de datos corrupta
# KB guarda datos en SQLite. Si el archivo está corrupto:
ls -la /opt/knowledge-hub/data/
# Hacer backup y crear base nueva:
cp /opt/knowledge-hub/data/kb.db /opt/knowledge-hub/data/kb.db.backup.$(date +%Y%m%d)
rm /opt/knowledge-hub/data/kb.db
sudo systemctl restart knowledge-hub

# Causa D: Túnel SSH caído (desde la PC)
# En Desktop Chat, pedir: "reconecta los túneles"
# O usar la tool tunnel_reconnect del MCP sypnose-tunnels
```

---

### Boris hook bloquea commit

**Síntoma:** Al intentar hacer `git commit`, el hook lanza:
`BLOQUEADO: Falta verificación. Usa boris_verify primero.`

**Causa:** Es el comportamiento correcto — el hook Boris funciona. El arquitecto
intentó hacer commit sin evidencia de verificación.

**Solución correcta:**

```bash
# 1. Verificar el cambio según su tipo
# Para Python:
python3 archivo_modificado.py
# o
pytest tests/ -v

# Para API:
curl -X GET http://localhost:3000/api/endpoint

# Para UI:
# Usar Chrome MCP para navegar y confirmar visualmente

# 2. Llamar boris_verify con evidencia real
# Desde Claude Code, usar el MCP boris_verify con:
#   what_changed: "descripción concreta del cambio"
#   how_verified: "cómo lo verifiqué (mínimo 20 chars)"
#   result: "resultado real con output (mínimo 15 chars)"

# 3. boris_verify escribe .brain/last-verification.md con "APROBADO"
# 4. Ahora git commit ya pasa
```

**Solución de emergencia (usar solo en casos extremos):**

```bash
# Si necesitas hacer commit y es imposible verificar (ej: cambio en docs)
git commit --no-verify -m "docs: actualizar README — verificación no aplica"
# SIEMPRE documentar por qué se saltó la verificación en el mensaje del commit
```

---

### OpenClaw no despierta / no audita

**Síntoma:** No llegan alertas Telegram. El servicio openclaw está "corriendo"
según systemctl pero no hace nada visible.

**Diagnóstico:**

```bash
# Ver si el proceso está vivo
sudo systemctl status openclaw

# Ver heartbeat — debe cambiar cada ~30 min
cat ~/.openclaw/workspace/HEARTBEAT.md

# Ver logs en tiempo real
sudo journalctl -u openclaw -f
```

**Soluciones:**

```bash
# Causa A: Silenciado accidentalmente
openclaw status
# Si dice "paused" o "muted":
openclaw resume

# Causa B: Error en configuración openclaw.json
openclaw validate-config
# Corregir los errores que muestre

# Causa C: KB no responde (OpenClaw depende de KB)
curl http://localhost:18791/health
# Si KB está caído, primero arreglar KB (ver sección anterior)

# Causa D: El proceso cuelga sin morir
sudo systemctl restart openclaw
```

---

### Arquitecto no ejecuta tarea del KB

**Síntoma:** El SM envió una tarea via `kb_save` y `sm-tmux send`, pero el
arquitecto no la ejecuta. La sesión tmux está activa pero parece ignorar el aviso.

**Diagnóstico:**

```bash
# 1. Verificar que la tarea llegó al KB
# En Desktop Chat:
# kb_read key=task-arquitecto-nombre project=proyecto

# 2. Ver qué está haciendo la sesión tmux
# En Desktop Chat (via SSH MCP):
# sm-tmux capture nombre-sesion

# 3. Verificar que el arquitecto está en modo correcto
# Si está en modo "normal" (no --continue), puede no estar leyendo KB
```

**Soluciones:**

```bash
# Causa A: El arquitecto está esperando respuesta del usuario
# Enviar el comando directamente:
# sm-tmux send nombre-sesion "kb_read key=task-... project=..."

# Causa B: La sesión tmux está en modo search o bloqueada
# sm-tmux send nombre-sesion "" (enviar Escape)
# Luego reenviar la tarea

# Causa C: El arquitecto no tiene el MCP KB configurado
# Verificar .mcp.json en el proyecto del arquitecto
# Debe tener knowledge-hub configurado

# Causa D: El nombre de la sesión tmux es incorrecto
# sm-tmux list → ver todas las sesiones activas
# Usar el nombre exacto que aparece en la lista

# Causa E: El arquitecto leyó la tarea pero no la aprobó internamente
# El SM debe haber seguido los 6 pasos del protocolo:
# approve ANTES de send → Carlos OK → send
# Si se saltó el approve, el arquitecto puede estar esperando
```

---

<a name="apendice-d"></a>
# APÉNDICE D: Checklist Post-Instalación

Después de instalar Sypnose completo, verificar cada punto en orden.
No avanzar al siguiente si el anterior falla.

## Servidor

1. [ ] `node --version` muestra v22 o superior
2. [ ] `claude --version` muestra v2.1.52 (no 2.1.72 ni 2.1.73)
3. [ ] `echo $CLAUDE_CODE_DISABLE_AUTOUPDATE` muestra `1`
4. [ ] `tmux --version` responde (cualquier versión)
5. [ ] `curl http://localhost:18791/health` responde `{"status":"ok"}`
6. [ ] `sudo systemctl status knowledge-hub` muestra `active (running)`
7. [ ] `curl http://localhost:8317/health` responde (SypnoseProxy activo)
8. [ ] `cat ~/scripts/tmux-claude.sh` existe y tiene contenido
9. [ ] `~/scripts/tmux-claude.sh --help` o ejecutarlo sin args no da error fatal
10. [ ] `cozempic --version` muestra 1.3.0 o superior

## Por cada proyecto en el servidor

11. [ ] Directorio `.brain/` existe en el proyecto
12. [ ] Directorio `.claude/hooks/` existe en el proyecto
13. [ ] `.claude/hooks/boris-verification-gate.sh` existe y tiene permisos de ejecución
14. [ ] `.claude/settings.json` tiene los hooks de Boris configurados
15. [ ] `.mcp.json` del proyecto tiene el Knowledge Hub configurado
16. [ ] `.brain/task.md` existe (aunque esté vacío o con "ninguna")
17. [ ] `cozempic analyze` en el directorio del proyecto no da error
18. [ ] Sesión tmux arranca con `tmux-claude.sh NOMBRE_SESION /ruta/proyecto`
19. [ ] Claude arranca automáticamente dentro de la sesión tmux

## OpenClaw (si instalado)

20. [ ] `openclaw --version` responde
21. [ ] `~/.openclaw/openclaw.json` existe y tiene configuración válida
22. [ ] `~/.openclaw/workspace/SOUL.md` existe con contenido
23. [ ] `openclaw validate-config` sin errores
24. [ ] `openclaw test-telegram` envía mensaje a Telegram exitosamente
25. [ ] `openclaw status` muestra `KB: connected`
26. [ ] `sudo systemctl status openclaw` muestra `active (running)`

## PC del usuario (Desktop Chat)

27. [ ] `claude_desktop_config.json` existe y tiene sintaxis JSON válida
28. [ ] El MCP `sypnose-tunnels` está configurado con IP, puerto, usuario y SSH key correctos
29. [ ] El MCP `knowledge-hub` está configurado apuntando a localhost:18793
30. [ ] La SSH key existe en el path configurado: `ls C:\Users\USUARIO\.ssh\id_rsa`
31. [ ] Desktop Chat arranca sin errores en la consola de MCPs
32. [ ] En Desktop Chat: "¿cuántos túneles están conectados?" → responde 5/5
33. [ ] En Desktop Chat: `kb_list` → devuelve respuesta (no error de conexión)
34. [ ] En Desktop Chat: `kb_save key=test-instalacion value="ok"` → responde "guardado"
35. [ ] El proyecto "SYPNOSE" existe en Desktop Chat con las instrucciones del SM
36. [ ] Desde el proyecto SYPNOSE: "ejecuta protocolo de inicio" → invoca el skill correctamente

## Test de integración completo

37. [ ] Abrir PowerShell en carpeta de un proyecto → conecta al servidor via tmux
38. [ ] Claude arranca en el servidor con `--continue`
39. [ ] En Desktop Chat (proyecto SYPNOSE): "manda una tarea simple al arquitecto: escribe 'hola' en .brain/test.md"
40. [ ] El arquitecto en el servidor recibe la tarea, la ejecuta, hace commit, notifica
41. [ ] Desktop Chat recibe la notificación KB y reporta el resultado a Carlos

Si los 41 puntos pasan: **SYPNOSE está 100% operativo.**

---

<a name="apendice-e"></a>
# APÉNDICE E: Security Hardening

Configuración de seguridad para el servidor Sypnose. Aplicar en este orden
exacto — algunas reglas dependen de otras.

**ADVERTENCIA:** Antes de aplicar cualquier cambio de firewall, abrir una segunda
conexión SSH en otra terminal. Si algo falla, tienes la segunda conexión para
revertir.

---

## E.1 — UFW (Firewall)

```bash
# Instalar si no está
sudo apt-get install -y ufw

# Reset a estado limpio
sudo ufw --force reset

# Política por defecto: bloquear todo
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH — SOLO IPs de confianza
# Reemplaza con las IPs reales de tu ISP
sudo ufw allow from 186.7.0.0/16 to any port 2024
sudo ufw allow from 190.167.0.0/16 to any port 2024
# Si trabajas desde más IPs, agregar aquí

# HTTP/HTTPS públicos
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Servicios internos — SOLO loopback (nunca al exterior)
sudo ufw deny 18789    # OpenClaw Gateway — solo via túnel SSH
sudo ufw deny 18790    # OpenClaw UI — solo via túnel SSH
sudo ufw deny 18791    # Knowledge Hub API — solo via túnel SSH
sudo ufw deny 18793    # Knowledge Hub SSE — solo via túnel SSH
sudo ufw deny 8317     # SypnoseProxy — solo via túnel SSH
sudo ufw deny 3000     # Codeman — solo via túnel SSH
sudo ufw deny 3002     # Sypnose Agent v2 — solo via túnel SSH

# Activar
sudo ufw --force enable

# Verificar estado
sudo ufw status verbose
```

### Verificar que SSH sigue funcionando

Desde tu PC, en otra terminal:

```bash
ssh -p 2024 usuario@IP_SERVIDOR
# Si conecta → las reglas son correctas
```

Si no conecta, revertir desde la sesión SSH que tenías abierta:

```bash
sudo ufw --force reset
sudo ufw default allow incoming
```

---

## E.2 — Fail2ban

```bash
# Instalar
sudo apt-get install -y fail2ban

# Crear configuración personalizada (nunca editar jail.conf directamente)
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Banear por 1 hora
bantime = 3600
# Ventana de tiempo para contar intentos: 10 minutos
findtime = 600
# Máximo 5 intentos antes de banear
maxretry = 5
# Enviar email (opcional)
# destemail = tu@email.com

[sshd]
enabled = true
port = 2024
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[sshd-ddos]
enabled = true
port = 2024
logpath = /var/log/auth.log
maxretry = 10
findtime = 60
bantime = 86400
EOF

# Reiniciar fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Verificar estado
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### Ver IPs baneadas

```bash
sudo fail2ban-client status sshd
# Muestra IPs en "Banned IP list:"
```

### Desbanear una IP (si te baneaste tú mismo)

```bash
sudo fail2ban-client set sshd unbanip IP_A_DESBANEAR
```

---

## E.3 — SSH Hardening

Editar configuración SSH:

```bash
sudo nano /etc/ssh/sshd_config
```

Verificar o agregar estas líneas:

```
# Deshabilitar login con contraseña (solo SSH keys)
PasswordAuthentication no
ChallengeResponseAuthentication no

# Deshabilitar login como root
PermitRootLogin no

# Solo usuarios específicos (reemplaza con tu usuario)
AllowUsers gestoria

# Puerto no estándar (ya tienes 2024 — mantenerlo)
Port 2024

# Desconectar sesiones inactivas después de 30 minutos
ClientAliveInterval 1800
ClientAliveCountMax 2

# Limitar intentos de login
MaxAuthTries 3

# Deshabilitar X11 forwarding (no lo necesitas)
X11Forwarding no

# Deshabilitar reenvío de agente SSH (precaución adicional)
AllowAgentForwarding no
```

Aplicar cambios:

```bash
# Verificar sintaxis ANTES de reiniciar
sudo sshd -t
# Si no hay output → configuración válida

# Reiniciar SSH
sudo systemctl restart sshd

# Verificar desde otra terminal que puedes conectar
ssh -p 2024 usuario@IP
```

---

## E.4 — Docker Security

### Evitar cryptominers en contenedores

Incidente documentado en el sistema de Carlos: un contenedor Docker fue
comprometido y corrió un cryptominer. Prevención:

```bash
# 1. Nunca ejecutar contenedores con --privileged a menos que sea obligatorio
# 2. Limitar recursos para que un miner no pueda usar todo el CPU
docker run --cpus="0.5" --memory="512m" nombre-imagen

# 3. Bloquear acceso a internet para contenedores que no lo necesitan
docker network create --internal red-interna-sin-internet
docker run --network red-interna-sin-internet nombre-imagen

# 4. Monitorear uso de CPU — un miner se delata
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Si ves un container con CPU > 80% constantemente → sospechoso
```

### Backup obligatorio antes de deploy

```bash
# SIEMPRE antes de docker stop/rm/restart en producción:
FECHA=$(date +%Y%m%d-%H%M)
docker commit nombre-container nombre-container-backup-$FECHA

# Verificar que la imagen existe
docker images | grep backup

# Solo entonces proceder con el deploy
docker stop nombre-container
docker rm nombre-container
docker run ...nuevo...

# Si algo falla, restaurar:
docker run --name nombre-container nombre-container-backup-$FECHA
```

### Limitar capabilities de contenedores

```bash
# En docker-compose.yml:
services:
  mi-app:
    image: mi-imagen
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE   # Solo si necesita puertos < 1024
    security_opt:
      - no-new-privileges:true
    read_only: true         # Filesystem de solo lectura
    tmpfs:
      - /tmp                # Área temporal en RAM
```

---

## E.5 — Whitelist de IPs

Registrar aquí las IPs autorizadas para acceso SSH. Actualizar cuando cambie
el ISP o se agreguen ubicaciones de trabajo nuevas.

```bash
# Ver IPs actualmente autorizadas en UFW
sudo ufw status | grep 2024

# Agregar nueva IP autorizada
sudo ufw allow from NUEVA_IP to any port 2024
sudo ufw reload

# Para verificar tu IP actual desde el servidor
who      # muestra conexiones SSH activas con IP de origen
ss -tn state established | grep :2024
```

**IPs del sistema de Carlos (ejemplo):**
- `186.7.0.0/16` — Claro RD (rango completo)
- `190.167.0.0/16` — Claro RD secundario

Si trabajas desde una VPN, agregar también la IP del servidor VPN.

---

<a name="apendice-f"></a>
# APÉNDICE F: Comandos Útiles del Día a Día

Referencia rápida de los comandos más usados. Organizada por rol.

---

## Para el SM (Desktop Chat)

Estos se usan dentro de Desktop Chat, en el proyecto SYPNOSE:

```
# Ver notificaciones pendientes
kb_list category=notification

# Leer una tarea específica
kb_read key=task-arquitecto-nombre project=proyecto

# Guardar una nota en KB
kb_save key=mi-nota value="contenido" category=reference project=proyecto

# Buscar en KB
kb_search query="término de búsqueda"

# Ver sesiones tmux activas
sm-tmux list

# Ver qué hace una sesión
sm-tmux capture nombre-sesion

# Enviar comando a una sesión
sm-tmux send nombre-sesion "kb_read key=task-..."

# Enviar para aprobación de Gemini
sm-tmux approve nombre-sesion "kb_read key=task-..."

# Estado de los túneles SSH
tunnel_status

# Reconectar túneles caídos
tunnel_reconnect
```

---

## Para los arquitectos (Claude Code en servidor)

```bash
# === INICIO DE SESIÓN ===
git pull origin $(git branch --show-current)

# === ANTES DE CADA TAREA ===
git tag pre-nombre-tarea -m "Punto de retorno"
git push origin pre-nombre-tarea

# === DURANTE EL TRABAJO ===
# Guardar estado cada 15-20 min (via MCP boris_save_state)
# O manualmente:
cat > .brain/task.md << 'EOF'
## Tarea actual: [descripción]
## Progreso: [x] paso1 [ ] paso2
## Próximo paso: [exactamente qué]
## Archivos modificados: [lista]
EOF

# === ANTES DE COMMIT ===
# Verificar el cambio (según tipo)
# Luego llamar boris_verify via MCP
# Luego hacer commit
git add archivo-específico
git commit -m "[TAG] descripción del cambio"
git push origin $(git branch --show-current)

# === ANÁLISIS CON IA GRATUITA ===
~/scripts/ask-gemini.sh "analiza este código: ..."
~/scripts/ask-gemini.sh "resume este log: ..." gemini-2.5-pro

# === VER ESTADO DEL SISTEMA ===
# Procesos corriendo
ps aux | grep -E "claude|openclaw|knowledge"

# Sesiones tmux
tmux ls

# Conectar a una sesión
tmux attach -t nombre-sesion

# === REVERTIR CAMBIOS ===
git reset --hard pre-nombre-tarea
```

---

## Gestión del servidor

```bash
# === REVISAR ESTADO GENERAL ===
uptime
free -h
df -h /

# Procesos que más RAM usan
ps aux --sort=-%mem | head -10

# Contenedores Docker
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker stats --no-stream

# === SERVICIOS SYPNOSE ===
sudo systemctl status knowledge-hub
sudo systemctl status openclaw
sudo systemctl status codeman
sudo systemctl status sypnose-proxy

# Reiniciar un servicio
sudo systemctl restart knowledge-hub
sudo systemctl restart openclaw

# Ver logs en tiempo real
sudo journalctl -u knowledge-hub -f
sudo journalctl -u openclaw -f

# === DOCKER ===
# Backup antes de deploy
docker commit CONTAINER CONTAINER-backup-$(date +%Y%m%d)
docker images | grep backup

# Limpiar imágenes viejas (con cuidado)
docker images | grep backup | tail -5
# Borrar solo imágenes antiguas, nunca las recientes:
docker rmi nombre-imagen-backup-viejo

# === RED Y SEGURIDAD ===
# Ver conexiones SSH activas
ss -tn state established | grep :2024

# Ver qué puertos están escuchando
ss -tlnp

# Ver IPs baneadas por fail2ban
sudo fail2ban-client status sshd

# Estado del firewall
sudo ufw status verbose

# === TMUX ===
# Listar sesiones
tmux ls

# Nueva sesión
tmux new-session -d -s nombre-sesion -c /ruta/proyecto

# Conectar
tmux attach -t nombre-sesion

# Desconectar sin cerrar
Ctrl+b, d

# Ver output de sesión sin conectar
tmux capture-pane -t nombre-sesion -p | tail -30

# Cerrar sesión
tmux kill-session -t nombre-sesion

# === GIT ===
# Estado limpio
git status && git log --oneline -5

# Ver qué cambió
git diff

# Crear punto de retorno
git tag pre-tarea -m "Punto de retorno"
git push origin pre-tarea

# Revertir
git reset --hard pre-tarea

# Ver todos los tags
git tag -l "pre-*"
```

---

## Comandos de diagnóstico rápido

Cuando algo no funciona y no sabes por dónde empezar:

```bash
# ¿KB responde?
curl -s http://localhost:18791/health && echo "KB OK" || echo "KB CAIDO"

# ¿SypnoseProxy responde?
curl -s http://localhost:8317/health && echo "PROXY OK" || echo "PROXY CAIDO"

# ¿OpenClaw responde?
curl -s http://localhost:18790/health && echo "OPENCLAW OK" || echo "OPENCLAW CAIDO"

# ¿Codeman responde?
curl -s http://localhost:3000 | head -1 && echo "CODEMAN OK" || echo "CODEMAN CAIDO"

# Resumen de todos los servicios en una línea
for svc in knowledge-hub openclaw codeman sypnose-proxy; do
  status=$(sudo systemctl is-active $svc 2>/dev/null || echo "unknown")
  echo "$svc: $status"
done

# Ver últimos errores de TODOS los servicios Sypnose
sudo journalctl --since "1 hour ago" -u knowledge-hub -u openclaw -u sypnose-proxy | grep -i error | tail -20
```

---

## Referencia rápida de puertos

| Puerto | Servicio | Acceso |
|---|---|---|
| 2024 | SSH | Solo IPs autorizadas |
| 80 / 443 | HTTP/HTTPS público | Todos |
| 3000 | Codeman Dashboard | Solo via túnel SSH |
| 3002 | Sypnose Agent v2 | Solo via túnel SSH |
| 8317 | SypnoseProxy | Solo via túnel SSH |
| 18789 | OpenClaw Gateway | Solo via túnel SSH |
| 18790 | OpenClaw Control UI | Solo via túnel SSH |
| 18791 | Knowledge Hub API | Solo via túnel SSH |
| 18793 | Knowledge Hub SSE | Solo via túnel SSH |

---

*SYPNOSE Manual — Parte 10 y Apéndices A-F*
*Sistema nervioso para agentes IA. Versión 2026-03.*
