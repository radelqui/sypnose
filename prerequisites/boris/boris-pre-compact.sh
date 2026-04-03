#!/bin/bash
# Boris v6.2 - PreCompact [command]
# Evento: PreCompact
# Tipo: command (rapido, deterministico)
# Funcion: Auto-guardar estado antes de perder contexto por compact

echo "Boris PreCompact: Guardando estado antes de compact..."

# Guardar estado actual en .brain/
if [ -d ".brain" ]; then
  # Actualizar session-state.md con timestamp
  BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
  LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "sin commits")
  UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l)

  cat > .brain/session-state.md << EOF
## Estado de sesion (pre-compact auto-save)
Ultima actualizacion: $(date -u '+%Y-%m-%d %H:%M UTC')
Fase: interrupted-by-compact
Branch: $BRANCH
Ultimo commit: $LAST_COMMIT
Archivos sin commit: $UNCOMMITTED

## NOTA
Contexto fue compactado. Al retomar:
1. Lee .brain/task.md para ver que estabas haciendo
2. Lee este archivo para ver donde quedaste
3. CONTINUA - no empieces de cero
EOF

  # Commit .brain/ para persistir
  git add .brain/ 2>/dev/null
  git commit -m "state: pre-compact auto-save" --no-verify 2>/dev/null

  echo "Estado guardado en .brain/ y committed."
else
  echo "No hay .brain/ - nada que guardar."
fi
