#!/bin/bash
# Boris v6.2 - SessionStart [command]
# Evento: SessionStart (startup, resume, clear, compact)
# Tipo: command (rapido, deterministico)
# Funcion: Re-inyecta estado de .brain/ al contexto del agente

PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_DIR")

echo "================================================================"
echo "  BORIS v6.2 -- SESSION START"
echo "  Proyecto: $PROJECT_NAME"
echo "================================================================"

# 1. SINCRONIZAR
git pull --rebase 2>/dev/null || echo "git pull fallo (sin remote o sin red)"

# 2. CREAR .brain/ si no existe con formato correcto
mkdir -p .brain
if [ ! -f ".brain/done-registry.md" ]; then
  cat > .brain/done-registry.md << 'REGISTRY'
# Done Registry

## Completado y verificado

| Fecha | Tarea | Verificacion | Commit |
|-------|-------|-------------|--------|

## Intentado pero fallido

| Fecha | Tarea | Por que fallo | Que se necesita |
|-------|-------|--------------|-----------------|
REGISTRY
fi
[ ! -f ".brain/task.md" ] && printf "# Task\n\nNo hay tarea activa.\n" > .brain/task.md
[ ! -f ".brain/session-state.md" ] && printf "# Session State\n\nNueva sesion.\n" > .brain/session-state.md
[ ! -f ".brain/history.md" ] && printf "# History\n\n" > .brain/history.md

# 3. TAREA PENDIENTE
if [ -f ".brain/task.md" ] && ! grep -q "No hay tarea activa" .brain/task.md 2>/dev/null; then
  echo ""
  echo "--- TAREA PENDIENTE ---"
  head -30 .brain/task.md
  echo "--- FIN TAREA ---"
fi

# 4. ESTADO DE SESION
if [ -f ".brain/session-state.md" ] && ! grep -q "Nueva sesion" .brain/session-state.md 2>/dev/null; then
  echo ""
  echo "--- ESTADO DE SESION ---"
  head -15 .brain/session-state.md
  echo "--- FIN ESTADO ---"
fi

# 5. DONE REGISTRY (ultimas completadas)
DONE_LINES=$(grep "^|" .brain/done-registry.md 2>/dev/null | grep -v "^| Fecha\|^| ---\|^|---" | tail -5)
if [ -n "$DONE_LINES" ]; then
  echo ""
  echo "--- ULTIMAS COMPLETADAS ---"
  echo "$DONE_LINES"
  echo "--- FIN COMPLETADAS ---"
fi

# 6. GIT STATUS
CHANGES=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$CHANGES" -gt 0 ]; then
  echo ""
  echo "ATENCION: $CHANGES ARCHIVOS SIN COMMIT:"
  git status --short | head -10
fi

# 7. REGLAS
echo ""
echo "================================================================"
echo "  BORIS v6.2 -- Hooks + Skill + MCP"
echo "================================================================"
echo "  Tarea pendiente -> CONTINUA. No empieces de cero."
echo "  Usa boris_start_task del MCP para iniciar tareas"
echo "  Usa boris_verify del MCP antes de commit"
echo "  Sin verificacion = sin commit (hook bloquea)"
echo "  Lee el Skill boris-workflow para el flujo completo"
echo "================================================================"
