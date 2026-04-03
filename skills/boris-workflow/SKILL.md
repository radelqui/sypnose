---
name: boris-workflow
description: >
  Flujo de desarrollo Boris v6.2. Se activa automaticamente cuando un agente
  empieza a trabajar en cualquier tarea. Define los 8 pasos obligatorios,
  las 5 Leyes de Hierro, y cuando usar cada herramienta MCP, GSD y Superpowers.
triggers:
  - "implement"
  - "fix"
  - "build"
  - "create"
  - "add"
  - "change"
  - "update"
  - "refactor"
  - "deploy"
  - "migrate"
  - "debug"
  - "feature"
  - "task"
  - "bug"
  - "issue"
---

# Boris Workflow v6.2 -- Skill

## RESUMEN EN 1 FRASE
Planifica -> Delega -> Verifica en Chrome/curl/test -> Registra -> Nunca repitas.

## HERRAMIENTAS MCP BORIS (llama cuando necesites)

| Herramienta | Cuando | Que hace |
|-------------|--------|----------|
| `boris_start_task` | PRIMERO, antes de cualquier trabajo | Anti-repeticion + git pull + tag + estado |
| `boris_save_state` | Cada 15-20 min o tras hito | Persiste progreso para sobrevivir reset |
| `boris_get_state` | Al arrancar o post-reset | Recupera donde quedaste |
| `boris_verify` | Tras verificar en Chrome/curl/test | Valida calidad de evidencia. RECHAZA vaguedad |
| `boris_register_done` | Tras commit+push | Marca completado. Evita repeticion futura |
| `boris_register_failed` | Cuando algo falla | Registra fallo para no repetir approach |
| `boris_sync` | Empezar (pull) y tras commit (push) | Sincroniza git |
| `boris_health` | Para ver estado general | Archivos sin commit, branch, etc |

## LOS 8 PASOS

### PASO 0: Contexto
```
Al inicio de sesion? -> boris_get_state o lee .brain/
Tarea pendiente en task.md? -> CONTINUA. No empieces de cero.
```

### PASO 1: Iniciar + Clasificar
```
-> Llama boris_start_task (verifica done-registry, crea tag, git pull)
-> Si retorna "YA COMPLETADA" -> PARAR. Informar.
-> Clasificar con superpowers:using-superpowers:
  Feature nueva -> superpowers:brainstorming (HARD GATE)
  Bug -> superpowers:systematic-debugging (4 fases)
  Implementacion -> superpowers:writing-plans (atomicas 2-5 min)
```

### PASO 2: Planificar (OBLIGATORIO)
```
1-2 archivos -> Plan Mode (shift+tab x2) -> auto-accept
3-10 archivos -> /gsd:discuss-phase -> /gsd:plan-phase (plan-checker + Nyquist)
10+ archivos -> code-architect -> /gsd:plan-phase + Perplexity/Gemini
Arquitectura nueva / integracion externa -> Consultar Claude Web (ver abajo)

REGLAS:
- Plan incluye COMO verificar CADA cambio
- Plans auto-contenidos: CONTEXTO + RAZONES + TAREAS
- Plans caben en ~50% contexto (2-3 tareas max por plan)
- "Mejora este plan. Tu conoces el codigo mejor."
```

### Consultar Claude Web via Chrome MCP (tareas complejas):
```
Cuando: proyecto nuevo, 10+ archivos, arquitectura nueva, integracion externa,
        o problema que fallo 3+ veces.
Como:
1. Abre Chrome MCP -> navega a claude.ai
2. Abre chat nuevo -> explica el problema con contexto REAL
   (tu tienes el codigo, logs, errores, estado -- dale TODO)
3. Claude Web investiga, disena, propone plan
4. Lee la respuesta directamente en Chrome
5. Vuelve al VPS y MEJORA el plan con tu conocimiento local
6. Entonces /gsd:plan-phase con el plan mejorado
7. Si necesitas ajustar -> vuelve al chat y re-pregunta

Claude Web = herramienta de investigacion y diseno, como Perplexity pero
para analisis profundo, arquitectura, y problemas complejos.
```

### PASO 3: Preparar
```
- Tag de retorno (boris_start_task ya lo hizo)
- Docker commit si es deploy
- Actualizar .brain/task.md con plan
```

### PASO 4: Ejecutar (DELEGAR -- el arquitecto NO codea)
```
Simple -> Subagente Sonnet general-purpose
Multi-archivo -> Teams + /gsd:execute-phase (waves)
Multi-problema -> superpowers:dispatching-parallel-agents
Overnight -> Ralph (--max-iterations 20-50)

TDD Iron Law: Test FALLA -> codigo -> test PASA
Guardar estado: boris_save_state cada 15-20 min
```

### PASO 5: Verificar CADA cambio
```
UI -> Chrome MCP: navegar, clickear, ver que funciona
API -> curl con datos reales -> response + status code
BD -> SELECT que confirme el cambio
Python -> pytest -> output con PASSED
JS/TS -> npm test / npm run build -> output
Config -> curl health endpoint

PROHIBIDO: "deberia funcionar", "creo que", "parece"
OBLIGATORIO: output real, resultado concreto
```

### PASO 6: Pipeline Boris
```
1. code-simplifier -> limpia
2. build-validator -> compila, lint, types
3. verify-app -> Chrome/curl/test
4. /gsd:verify-work (complejas) -> existe? real? conectado?

Si falla 1a -> fix y re-verificar
Si falla 2a -> repensar approach
Si falla 3a -> Escalar a Claude Web via Chrome MCP:
  Abre claude.ai -> explica que se intento, por que fallo, logs relevantes
  Claude Web analiza y propone approach alternativo
  Vuelve con el nuevo approach al flujo Boris
Si falla 4+ -> PARAR. Reportar a Carlos.
```

### PASO 7: Commit
```
1. Llama boris_verify con evidencia CONCRETA (MCP valida calidad)
2. git commit (hook verifica que boris_verify aprobo)
3. boris_sync direction="push"
```

### PASO 8: Registrar y terminar
```
1. boris_register_done (marca completada, evita repeticion)
2. Actualizar .brain/history.md
3. Si errores nuevos -> actualizar CLAUDE.md
```

## 5 LEYES DE HIERRO (de Superpowers)

1. **NO IMPLEMENTAR SIN DISENO** -- TODO pasa por diseno, sin excepcion
2. **NO ARREGLAR SIN CAUSA RAIZ** -- 4 fases: root cause -> pattern -> hypothesis -> fix
3. **TDD** -- RED -> GREEN -> REFACTOR. Codigo sin test = borrar y empezar de nuevo
4. **NO "LISTO" SIN EVIDENCIA** -- Ejecutar, leer output, confirmar, ENTONCES afirmar
5. **MEJORAR TODO PLAN** -- Corregir falsos positivos, anadir lo que falta

## ROUTING DE MODELOS

| Quien | Modelo | Para que |
|-------|--------|----------|
| Arquitectos (tu) | Opus 4.6 | Planificar, disenar, delegar |
| Sub-agentes | Sonnet 4.6 | Implementar, ejecutar |
| Monitoring | DeepSeek/Gemini/Qwen | Health checks -- NUNCA Claude |
| Docs grandes | [GEMINI] via :8317 | Analisis >500 lineas |
| Busquedas | [PERPLEXITY] via :8318 | Investigar antes de implementar |
| Estrategia | [CLAUDE:web] via Chrome MCP | Investigacion profunda, arquitectura, problemas 3+ fallos |

## GSD INTEGRADO

```
Tareas complejas (3+):
  /gsd:discuss-phase -> /gsd:plan-phase -> /gsd:execute-phase -> /gsd:verify-work
Tareas simples:
  /gsd:quick "descripcion"
Model profiles:
  /gsd:set-profile quality|balanced|budget
```

## RECUPERACION POST-RESET

Si pierdes contexto:
1. Llama boris_get_state del MCP
2. O lee manualmente: .brain/task.md + session-state.md + done-registry.md
3. Si hay tarea pendiente -> CONTINUA donde quedaste
4. Si no hay tarea -> espera instrucciones o llama boris_start_task

## ANTI-PATRONES (PROHIBIDO)

- Codear sin boris_start_task primero
- Commit sin boris_verify primero
- "Listo" sin evidencia concreta
- Repetir tarea del done-registry
- 30+ min sin boris_save_state
- Arquitecto escribiendo codigo directamente
- Olvidar git push tras commit
- Saltar planificacion para 3+ archivos
- Usar Opus para sub-agentes (usar Sonnet)
- Usar Claude para busquedas (usar Perplexity)
