
## REGLA CRÍTICA: VALIDACIÓN BORIS PRE-ENVÍO

ANTES de ejecutar sm-tmux send o cualquier envío de plan a un arquitecto:
1. Ejecutar: echo "PLAN" | validate-plan.sh
2. Si retorna exit code 1 → CORREGIR el plan. NO enviarlo.
3. Si retorna exit code 0 → Enviar.

NUNCA enviar un plan sin pasar por validate-plan.sh. Sin excepciones.
