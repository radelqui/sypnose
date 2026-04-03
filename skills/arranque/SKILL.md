---
name: arranque
description: >
  Proceso de arranque de sesion. Carga deferred tools, Knowledge Base y estado.
  Invocar SIEMPRE como primer paso al iniciar cualquier sesion.
  Sin esto, herramientas como TaskCreate, WebSearch, SendMessage no funcionan.
triggers:
  - "arranque"
  - "inicio"
  - "startup"
  - "boot"
---

# Arranque de Sesion

Proceso estandar de inicio. Ejecuta los 3 bloques EN PARALELO.

## Bloque 1: Cargar herramientas diferidas (3 llamadas ToolSearch EN PARALELO)

ToolSearch query="select:TaskCreate,TaskList,TaskUpdate,TaskGet"
ToolSearch query="select:WebSearch,WebFetch,SendMessage,AskUserQuestion"
ToolSearch query="select:EnterPlanMode,ExitPlanMode,CronCreate,CronList,CronDelete"

## Bloque 2: Cargar Knowledge Base (EN PARALELO con Bloque 1)

mcp__knowledge-hub__kb_context (sin parametros)

## Bloque 3: Recuperar estado (EN PARALELO con Bloque 1)

mcp__boris__boris_get_state (sin parametros)

## Despues del arranque

- Si hay tarea pendiente en el estado -> CONTINUA donde quedaste
- Si no hay tarea -> informa al usuario que estas listo
- Las herramientas TaskCreate, WebSearch, etc. ya funcionan

## Nota

Este proceso existe porque Claude Code usa "deferred tools" — herramientas que
no estan disponibles hasta que se cargan explicitamente con ToolSearch.
Sin este paso, cualquier intento de usar TaskCreate o WebSearch falla silenciosamente.
