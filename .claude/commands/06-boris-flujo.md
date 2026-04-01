# REGLA: Flujo Boris obligatorio

## Antes de tocar codigo
git pull origin $(git branch --show-current)
git tag pre-[tarea] -m "Punto de retorno"
git push origin pre-[tarea]

## Planificar
- Dividir en Waves (Wave 1 paralelo, Wave 2 depende de 1)
- Sub-agentes: model sonnet. NUNCA opus.

## Verificar ANTES de declarar completado
- Tests/syntax check pasan
- Servicio responde
- Commit + push hecho
- .brain/history.md actualizado

## AL TERMINAR CADA TAREA: Notificar al SM (OBLIGATORIO)
Despues del git push, SIEMPRE ejecutar estos 2 curls con DATOS REALES (no placeholders):

1. Enviar resumen detallado:
curl -s -X POST http://localhost:9099/api/sm/dashboard/summaries -H 'X-Api-Key: huygh-secret-2026' -H 'Content-Type: application/json' -d '{"task":"NOMBRE-REAL-de-la-tarea","pseudocode":"paso1: hice X. paso2: modifique Y. paso3: verifique Z","decisions":["elegi A porque B","descarte C porque D"],"result":"que quedo funcionando y como verificarlo"}'

2. Notificar completado con detalle REAL:
curl -s -X POST http://localhost:9099/api/sm/notifications -H 'X-Api-Key: huygh-secret-2026' -H 'Content-Type: application/json' -d '{"type":"task_complete","result":"RESUMEN: que hiciste en 1 linea","detail":"COMMITS: hash1 hash2. ARCHIVOS: lista. PROBLEMAS: si hubo alguno. PENDIENTE: si queda algo."}'

REGLAS de los curls:
- detail NUNCA puede ser null ni placeholder — es el campo mas importante
- NUNCA dejar campos como placeholder ([nombre], [resumen], [hash], etc)
- result DEBE tener el resumen real de lo que hiciste en 1 linea
- detail DEBE incluir: COMMITS: hash-real. ARCHIVOS: lista-real. PROBLEMAS: si hubo. PENDIENTE: si queda.
- pseudocode DEBE describir los pasos reales que seguiste, no genericos
- Si el curl falla, reintentar 1 vez. Si falla 2 veces, documentar en .brain/history.md
- Sin estos curls con datos reales, el SM esta ciego y no puede asignar nuevo trabajo
