#!/bin/bash
# Boris v6.2.1 — Verification Gate (PreToolUse matcher: Bash)
# Bloquea git commit sin evidencia verificada en .brain/last-verification.md
# PROTEGIDO: deny rules impiden edicion por el agente

INPUT=$(cat 2>/dev/null || true)
[ -z "$INPUT" ] && exit 0

# 1. Solo interceptar comandos que contengan git commit
echo "$INPUT" | grep -q "git.commit\|git -C [^ ]* commit" || exit 0

# 2. Permitir commits internos (estado, merge, --no-verify)
echo "$INPUT" | grep -q "\-\-no-verify" && exit 0
for P in "state:" "WIP:" "merge" "Merge" "pre-compact" "auto-save"; do
  echo "$INPUT" | grep -q "\-m.*$P" && exit 0
done

# 3. Anti-trampa: bloquear si ESCRIBE evidencia y commitea en el mismo comando
# Detectar: printf/echo/cat/tee > last-verification.md ... && ... git commit
if echo "$INPUT" | grep -qE "(printf|echo|cat|tee|>).*last-verification\.md" && echo "$INPUT" | grep -q "git.*commit"; then
  echo "BLOQUEADO: Escribe evidencia y commit en comandos separados." >&2
  exit 2
fi

# 4. Directorio del proyecto
PROJECT_DIR=$(echo "$INPUT" | jq -r .cwd // empty 2>/dev/null)
[ -z "$PROJECT_DIR" ] && PROJECT_DIR="$(pwd)"
VF="$PROJECT_DIR/.brain/last-verification.md"

# 5. GATE: Existe evidencia?
if [ ! -f "$VF" ]; then
  echo "BLOQUEADO: Falta .brain/last-verification.md" >&2
  echo "Verifica tu cambio, escribe evidencia, luego commit." >&2
  exit 2
fi

# 6. GATE: Sin frases vagas
if grep -qi "deberia funcionar\|creo que\|parece que\|should work\|seems like\|i think\|probablemente" "$VF" 2>/dev/null; then
  echo "BLOQUEADO: Evidencia con frases vagas." >&2
  exit 2
fi

# 7. GATE: Largo minimo (30 chars)
[ "$(wc -c < "$VF" 2>/dev/null || echo 0)" -lt 30 ] && echo "BLOQUEADO: Evidencia muy corta." >&2 && exit 2

# 8. Consumir evidencia (cada commit necesita la suya)
mv "$VF" "$VF.used" 2>/dev/null
exit 0
