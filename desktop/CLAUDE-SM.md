# SYPNOSE — Protocolo SM para Claude Desktop

Este archivo reemplaza los slash commands de Claude Code CLI.
En Desktop, copia este contenido a tu CLAUDE.md del proyecto.

## PROTOCOLO BIOS (equivalente a /bios)

Al iniciar sesion, ejecutar estos pasos EN ORDEN:

1. Leer MEMORY.md del proyecto
2. Leer .brain/task.md y .brain/session-state.md
3. kb_inbox_check para notificaciones
4. Verificar arquitectos: tmux list-sessions
5. Reportar en 3 lineas: donde estamos, que falta, que recomiendas

## PROTOCOLO CREAR PLAN (equivalente a /sypnose-create-plan)

Para enviar trabajo a un arquitecto:

1. INVESTIGAR: kb_search del tema, leer .brain/history.md del destino
2. CREAR PLAN con 6 etiquetas: PLAN, TAREA, MODELO, BORIS, VERIFICACION, EVIDENCIA, KB
3. MOSTRAR a Carlos — NO enviar sin aprobacion
4. GUARDAR en KB: kb_save key=task-[nombre] category=task
5. ENVIAR via sm-tmux: sm-tmux send [sesion] "kb_read key=[nombre] && echo EJECUTA"
6. MONITOREAR: kb_search resultado, git log, verificar criterios

## PROTOCOLO WORKFLOW

Antes de tocar codigo:
1. git pull
2. git tag pre-[tarea]
3. Planificar en waves

Ejecucion: delegar con Agent tool (model: sonnet, NUNCA opus)
Despues: git commit + git push + documentar en .brain/
