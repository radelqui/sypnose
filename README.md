# SYPNOSE v5.2 — Sistema de Orquestacion IA Multi-Agente

Sistema completo para orquestar multiples agentes Claude Code trabajando en paralelo.
Incluye coordinator, bus de comunicacion (KB), verificacion (Boris), comunicacion live (SSE)
y router de modelos con 47 IAs (la mayoria gratis).

Un Service Manager (SM) coordina arquitectos que ejecutan. Nadie programa solo. Todos verifican.

## Quick Start (servidor Linux)

```bash
git clone https://github.com/radelqui/sypnose.git
cd sypnose
sudo bash install-sypnose-full.sh gestoria   # reemplaza "gestoria" con tu usuario
```

El instalador configura Knowledge Hub, CLIProxy, Boris, SSE Hub y el Coordinator.
Tiempo estimado: 10-15 minutos en servidor limpio Ubuntu 22/24.

## Quick Start (desktop / Windows / Mac)

```bash
# 1. Instalar Claude Code
irm https://claude.ai/install.ps1 | iex      # Windows
curl -fsSL https://claude.ai/install.sh | sh  # Mac/Linux

# 2. Clonar repo
git clone https://github.com/radelqui/sypnose.git
cd sypnose

# 3. Abrir tunel SSH al servidor (debe estar corriendo)
ssh -L 18791:localhost:18791 \
    -L 18793:localhost:18793 \
    -L 8317:localhost:8317 \
    -L 8095:localhost:8095 \
    -p <PUERTO_SSH> <USUARIO>@<IP_SERVIDOR> -N &

# 4. Copiar MCP configs a Claude
#    Ver prerequisites/MCP-CONFIGS.md para la config completa

# 5. Arrancar y ejecutar protocolo de inicio
claude
/bios
```

## Estructura del repo

| Directorio / Archivo | Contenido |
|---|---|
| `install-sypnose-full.sh` | Instalador automatico completo (servidor) |
| `SYPNOSE-v52-MANUAL-INSTALACION.md` | Manual detallado 22 secciones, con troubleshooting |
| `CLAUDE.md` | Identidad, flujo Boris, protocolo completo para agentes |
| `prerequisites/` | Componentes instalables por separado |
| `prerequisites/boris/` | Boris MCP (644 lineas Python) + 6 hooks bash |
| `prerequisites/knowledge-hub/` | KB Hub: bus de comunicacion SQLite + API REST |
| `prerequisites/cliproxy/` | CLIProxy: router Go para 47 modelos IA |
| `prerequisites/sm-tmux/` | sm-tmux: CLI para enviar planes a arquitectos |
| `prerequisites/channel/` | Channel MCP: cliente SSE para Claude Code |
| `prerequisites/sypnose-hub/` | SSE Hub: bridge tiempo real sobre KB |
| `prerequisites/openclaw/` | Scripts OpenClaw (monitor 24/7, Telegram, salud) |
| `prerequisites/templates/` | Templates para nuevos agentes (settings, hooks, CLAUDE.md) |
| `prerequisites/MCP-CONFIGS.md` | Configs MCP para servidor y desktop |
| `desktop/` | Protocolo SM adaptado para Claude Desktop |
| `desktop/CLAUDE-SM.md` | Equivalentes de /bios y /sypnose-create-plan en Desktop |
| `desktop/sypnose-tunnels/` | MCP que abre tuneles SSH automaticamente |
| `skills/` | Slash commands para Claude Code (5 skills) |
| `skills/arranque/` | /arranque — boot de sesion |
| `skills/boris-workflow/` | /boris-workflow — flujo de desarrollo v6.2 |
| `skills/sypnose-create-plan/` | /sypnose-create-plan — protocolo SM para enviar planes |
| `skills/capcut-video/` | /capcut-video — crear videos en CapCut programaticamente |
| `skills/claw-setup-configuration/` | /claw-setup-configuration — setup OpenClaw |
| `sync-sypnose.sh` | Script de sincronizacion periodica (cron cada 6h) |
| `brain/` | Templates .brain/ para nuevos proyectos |
| `docs/` | Documentacion adicional |
| `docs/COMUNICACION-LIVE.md` | Protocolo SSE, canales, latencia, cierre global |
| `marketing/` | Assets de ventas y presentacion (HTML, pitchdeck, propuestas) |
| `v5.2/` | Paquete del coordinator (loop.js, memory, task-state, MCP) |
| `packages/` | Codigo fuente de los servicios del servidor |

## Componentes

| Componente | Puerto | Funcion |
|---|---|---|
| Knowledge Hub | 18791 | Bus SQLite. Todos los agentes leen y escriben aqui. |
| CLIProxy / SypnoseProxy | 8317 | Router de 47 modelos IA. Endpoint OpenAI-compatible. |
| Sypnose Coordinator | 18795 (SSE) | Motor principal: 7 yields, health checks, cost tracking. |
| SSE Hub | 8095 | Bridge tiempo real: KB -> Server-Sent Events. |
| Boris MCP | stdio | Quality gate: bloquea commit sin evidencia verificada. |
| Channel MCP | stdio | Cliente SSE: notificaciones live a Claude Code. |
| sm-tmux | CLI | Wrapper bash para enviar planes via KB + tmux con Gemini Gate. |
| OpenClaw | 18790 | Supervisor 24/7: salud, Telegram, reinicio automatico. |

## Documentacion

| Documento | Contenido |
|---|---|
| [Manual de Instalacion](SYPNOSE-v52-MANUAL-INSTALACION.md) | 22 secciones: instalacion completa, errores, troubleshooting |
| [CLAUDE.md](CLAUDE.md) | Flujo Boris, 9 pasos, KH API, modelos, Git rules |
| [MCP Configs](prerequisites/MCP-CONFIGS.md) | Configs para servidor y Windows/Mac |
| [CLAUDE-SM Desktop](desktop/CLAUDE-SM.md) | Protocolos BIOS y crear plan para Claude Desktop |
| [Comunicacion Live](docs/COMUNICACION-LIVE.md) | SSE, canales, protocolo cierre, latencia |
| [Errores Auditor](ERRORES-AUDITOR.md) | 15 errores encontrados durante instalacion + fixes |
| [Mejoras Post-Instalacion](MEJORAS-POST-INSTALACION.md) | Mejoras identificadas tras produccion |
| [Desktop Guia](SYPNOSE-DESKTOP-GUIA-INSTALACION.md) | Guia especifica para instalar en Windows/Mac |
| [Reglas Claude Code](SYPNOSE-REGLAS-CLAUDE-CODE.md) | Reglas que se copian al CLAUDE.md de cada proyecto |

## El Protocolo de 6 Etiquetas

Cada plan que el SM envia a un arquitecto debe tener estas 6 etiquetas (Gemini Gate las valida):

```
PLAN: descripcion en una linea de que se va a hacer
TAREA: que ejecutar concreto (comandos, archivos, alcance)
MODELO: modelo a usar. Sub-agentes: sonnet. NUNCA opus.
BORIS: git pull + git tag pre-[nombre] + backup archivos que se tocan
VERIFICACION: comando concreto (curl, npm test, cargo build, screenshot)
EVIDENCIA: output esperado concreto (status code, texto exacto, screenshot)
KB: kb_save key=resultado-[nombre] category=notification project=[proyecto]
```

## Arquitectura

```
              SERVICE MANAGER (Windows/Mac)
              Planifica, aprueba, coordina
                         |
              sm-tmux + KB + Gemini Gate
                         |
    ┌────────────────────┼────────────────────┐
    v                    v                    v
Knowledge Hub (:18791)  CLIProxy (:8317)  SSE Hub (:8095)
SQLite + REST + FTS5    47 modelos IA     Push en tiempo real
    |
    ├──> Agente 1 (tmux: gestion-contadoresrd)
    ├──> Agente 2 (tmux: iatrader-rust)
    ├──> Agente 3 (tmux: facturaia)
    └──> Agente N (tmux: ...)
         Cada uno con Boris hooks + .brain/ + CLAUDE.md
```

## Author

Carlos De La Torre — [LinkedIn](https://linkedin.com/in/carlosdelatorre-ai)
Metodologia Sypnose: Synapse + Synopsis + Hypnosis.
