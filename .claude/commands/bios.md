---
name: bios
description: Boot de sesión Sypnose. Verifica herramientas, lee estado, memoria, notificaciones, reporta. Ejecutar SIEMPRE al iniciar sesión.
user_invocable: true
---

# /bios — Boot de Sesión Sypnose

Eres parte del sistema multi-agente Sypnose de Carlos De La Torre.
Sigue estos pasos EN ORDEN. No saltes ninguno.

---

## PASO 0 — Verifica herramientas disponibles

Ejecuta estos checks en paralelo. Si algo falta, reporta qué falta.

**MCP Boris** (obligatorio):
```
boris_health
```
Si falla: "Boris MCP no disponible. Falta en settings.json → mcpServers → boris"

**MCP Knowledge Hub** (obligatorio):
```
kb_list limit=1
```
Si falla: "KB no disponible. Verificar túnel SSH 18791 y settings.json → mcpServers → knowledge-hub"

**Permisos** (obligatorio):
Verificar que `dangerouslySkipPermissions: true` está en settings.local.json.
Si no: "ADVERTENCIA: sin bypass permissions el agente se detendrá pidiendo permisos"

**Skills disponibles**: listar skills con Skill tool o ls .claude/commands/*.md
Mínimo esperado: /bios. Ideal: /bios + /sypnose-create-plan + /boris-workflow

**Git**: `git status` debe funcionar (estamos en un repo)

Reportar tabla:
```
| Herramienta | Estado |
|---|---|
| Boris MCP | ✅/❌ |
| Knowledge Hub | ✅/❌ |
| Bypass Permissions | ✅/❌ |
| Skills | N disponibles |
| Git | ✅/❌ |
```

Si Boris o KB faltan → PARAR. No se puede trabajar sin ellos.
Si bypass falta → ADVERTIR pero continuar.

---

## PASO 1 — Identifica quién eres

Lee el CLAUDE.md de tu proyecto. Si no hay CLAUDE.md local, lee el global.
Tu identidad está ahí: qué proyecto, qué stack, qué reglas.

Identifica:
- ¿Eres SM o arquitecto?
- ¿Qué proyecto? (gestoriard, facturaia, iatrader-rust, seguridad, oc-manual)
- ¿Qué stack? (Next.js, Rust, Python, infra)

---

## PASO 2 — Lee tu estado

```
boris_get_state  → estado completo (tarea, progreso, archivos)
```

Si boris_get_state no funciona, leer manualmente:
```
.brain/task.md → qué estabas haciendo
.brain/session-state.md → dónde quedaste
.brain/done-registry.md → qué ya se completó
```

Si hay tarea pendiente → esa es tu tarea. No inventes otra.
Si no hay estado → sesión nueva. Espera instrucciones.

---

## PASO 3 — Sincroniza código

```bash
git pull origin $(git branch --show-current)
```

Si falla (sin remote o sin red): reportar pero continuar.

---

## PASO 4 — Lee notificaciones y KB relevante

```
kb_inbox_check for=[tu-nombre-agente]
```

Nombres de agente por proyecto:
- gestoriard → gestion-contadoresrd o arquitecto-gestoriard
- facturaia → facturaia
- iatrader-rust → iatrader-rust
- seguridad → seguridad o seguridad-server
- oc-manual → oc-manual
- SM → sm-claude-web

Para cada notificación:
- Léela y clasifica: URGENTE / MEJORA / DECISIÓN / INFORMATIVO
- Si contiene "EJECUTA" → es tu tarea, ejecútala
- `kb_inbox_ack id=N` para cada una leída

Luego busca contexto:
```
kb_search "[nombre de tu proyecto]"
```
Lee las keys más recientes para saber qué se hizo últimamente.

---

## PASO 5 — Reporta en 3 líneas

1. **Dónde estamos**: última tarea completada o en progreso
2. **Qué falta**: pendientes concretos
3. **Qué recomiendas**: siguiente paso

Luego pregunta: **"¿Qué hacemos?"**

---

## DESPUÉS DEL BOOT

Ya estás operativo. Herramientas disponibles:

### Memoria y comunicación
| Herramienta | Para qué |
|---|---|
| `kb_search / kb_read / kb_save` | Memoria compartida entre agentes |
| `kb_inbox_check / kb_inbox_ack` | Notificaciones (leídas → desaparecen) |
| `a2a_send / a2a_messages` | Comunicación directa entre agentes |
| `channel_publish / channel_read` | Broadcast a grupos (system-alerts, deploy-notifications) |

### Boris (flujo de trabajo)
| Herramienta | Cuándo |
|---|---|
| `boris_start_task` | Al iniciar cualquier tarea |
| `boris_save_state` | Cada 15 min durante ejecución |
| `boris_verify` | ANTES de cada commit (obligatorio) |
| `boris_register_done` | Al completar tarea |

### Ejecución
| Herramienta | Para qué |
|---|---|
| `Agent tool` | Delegar código a sub-agentes (model: sonnet SIEMPRE) |
| `Bash` | Comandos de sistema (git, curl, docker, systemctl) |
| `Read / Glob / Grep` | Leer contexto del código |

---

## LAS 5 LEYES DE BORIS

1. **Sin evidencia no existe** — output real o no se hizo
2. **Verificación entre waves** — no pasar a Wave 2 sin demostrar Wave 1
3. **Al terminar → PARAR** — descubrimientos al KB, no a producción
4. **Despliegue explícito** — si el plan no dice deploy, no desplegar
5. **Carlos aprueba ANTES** — nunca actuar sin OK

---

## FLUJO DE TRABAJO RESUMIDO

```
boris_start_task → git pull + tag
  ↓
Wave 1: Agent(sonnet) ejecuta → VERIFICAR → boris_verify → commit
  ↓
Wave 2: Agent(sonnet) ejecuta → VERIFICAR → boris_verify → commit
  ↓
git push → boris_register_done → kb_save resultado
  ↓
"¿Qué más se puede mejorar?" → ciclo hasta "TODO PERFECTO"
```

---

## SI ERES SERVICE MANAGER (SM)

Tu trabajo extra:
- Crear planes con `/sypnose-create-plan`
- Enviar via `sm-tmux send [sesion] "kb_read key=[plan] && echo EJECUTA"`
- Verificar resultados cuando arquitectos terminan
- Ciclo mejoras hasta "TODO PERFECTO"
- Modelos baratos (qwen gratis) para todo excepto código core

**Lo que NUNCA haces como SM:**
- Programar ni generar código
- Lanzar sub-agentes (los arquitectos lo hacen)
- Hacer commits, builds, deploys
- Enviar trabajo sin aprobación de Carlos
- Decidir solo en temas estratégicos

---

## MODELO DE COSTOS

| Modelo | Costo | Usar para |
|---|---|---|
| qwen3-coder-plus | **gratis** | 80% del trabajo |
| gemini-2.5-flash | **gratis** | docs largos, OCR |
| nomic-embed-text | **gratis** (Ollama :11434) | embeddings RAG |
| claude-sonnet | pago | código general |
| claude-opus | pago caro | solo si Carlos pide |

---

## SI ALGO FALTA

Si durante el boot detectas que faltan herramientas, reporta a Carlos con esta tabla:

```
PROBLEMA: [qué falta]
SOLUCIÓN: [cómo instalarlo]
IMPACTO: [qué no puedes hacer sin ello]
```

Instalación de lo que falta:
- Boris MCP: añadir a settings.json mcpServers
- KB MCP: verificar túnel SSH 18791 + añadir a settings.json
- Skills: `git clone https://github.com/radelqui/sypnose.git` → copiar .claude/commands/
- Boris skill: `curl -L -o .claude/skills/boris/SKILL.md https://howborisusesclaudecode.com/api/install`
- Permisos: añadir `"dangerouslySkipPermissions": true` a settings.local.json

---

Bienvenido. El sistema funciona porque TODOS seguimos el mismo flujo.
