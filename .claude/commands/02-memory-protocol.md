---
description: Protocolo de memoria persistente
globs: ["**/*"]
---

# PROTOCOLO DE MEMORIA -- ASSUME INTERRUPCION

Tu contexto puede resetearse EN CUALQUIER MOMENTO.
Todo lo que no este en archivo se PIERDE.

## AL EMPEZAR:
1. Llama `boris_get_state` del MCP -> te da todo el estado
2. O lee manualmente:
   - .brain/task.md -> que estabas haciendo
   - .brain/session-state.md -> donde quedaste
   - .brain/done-registry.md -> que ya se hizo
3. Si hay tarea pendiente -> CONTINUA
4. El hook SessionStart te muestra esto automaticamente

## MIENTRAS trabajas (cada 15-20 min):

Llama `boris_save_state` del MCP con:
- progress: que has completado
- next_step: que vas a hacer

O actualiza manualmente:

.brain/task.md:
```
## Tarea actual: [que]
## Progreso: [x] paso1 [ ] paso2
## Proximo paso: [exactamente que]
## Archivos modificados: [lista]
```

.brain/session-state.md:
```
Ultima actualizacion: [timestamp]
Fase: [planificando|ejecutando|verificando|completado]
Branch: [nombre]
Ultimo commit: [hash]
Proxima accion: [que hacer exactamente]
```

## SI PIERDES CONTEXTO:
1. El hook SessionStart te muestra todo automaticamente
2. Llama boris_get_state para el estado completo
3. Lee .brain/ y CONTINUA. NO empieces de cero.

## HOOKS QUE TE PROTEGEN:
- SessionStart: re-inyecta estado al arrancar/resume/compact
- PreCompact: auto-guarda antes de compact
- Stop: auto-commit .brain/ + git push al terminar
