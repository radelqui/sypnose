#!/bin/bash
# Boris v6.2 - PreToolUse [command]
# Evento: PreToolUse (Write, Edit, Read para archivos sensibles)
# Tipo: command (deterministico, exit 2 = BLOQUEA)
# Funcion: Proteger .env, secrets, credenciales de ser leidos/editados/escritos

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // .tool_input.command // empty')

# Solo verificar herramientas que tocan archivos
case "$TOOL" in
  Write|Edit|Read|Bash)
    ;;
  *)
    exit 0
    ;;
esac

# Para Bash, extraer el archivo del comando
if [ "$TOOL" = "Bash" ]; then
  # Detectar si el comando toca archivos sensibles
  if echo "$FILE" | grep -qiE '\.env\b|credentials|secret|private.key|\.pem\b|\.key\b|password|token.*\.json'; then
    echo "BLOQUEADO: Comando toca archivo sensible." >&2
    echo "Los archivos .env, credentials, secrets no se pueden tocar via Bash." >&2
    exit 2
  fi
  exit 0
fi

# Para Write/Edit/Read, verificar el path del archivo
if [ -n "$FILE" ]; then
  BASENAME=$(basename "$FILE" 2>/dev/null || echo "$FILE")

  if echo "$BASENAME" | grep -qiE '^\.env$|^\.env\.|credentials|secret|private.key|\.pem$|\.key$|password'; then
    echo "BLOQUEADO: Archivo sensible detectado: $BASENAME" >&2
    echo "Los archivos .env, credentials, secrets, keys NO se pueden leer ni modificar." >&2
    echo "Si necesitas configurar variables de entorno, pide a Carlos que lo haga manualmente." >&2
    exit 2
  fi
fi

exit 0
