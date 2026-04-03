#!/bin/bash
# Boris v6.2.1 - Stop [command]
# Auto-save .brain/ al terminar sesion
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 0
if [ -d .brain ]; then
  git add .brain/ 2>/dev/null
  git diff --cached --quiet .brain/ 2>/dev/null || git commit -m "state: auto-save on stop" --no-verify 2>/dev/null
  git push 2>/dev/null || true
fi
exit 0
