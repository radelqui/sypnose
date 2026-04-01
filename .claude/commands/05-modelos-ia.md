# REGLA: Modelos de IA disponibles

NO solo tienes Claude. Tienes 42 modelos via CLIProxyAPI.

## Comandos rapidos
- Investigar web: ~/scripts/ask-perplexity.sh "pregunta"
- Analizar docs largos: ~/scripts/ask-gemini.sh "texto"
- Ver modelos: curl -s http://localhost:8317/v1/models | python3 -m json.tool

## Modelos clave
- Perplexity (:8318): Busquedas web, investigacion
- Gemini 2.5 Flash (:8317): Contexto largo, analisis batch
- DeepSeek v3.2 (:8317): Razonamiento, validacion
- Claude Haiku (:8317): Tareas ligeras

## Regla obligatoria
- Claude Opus/Sonnet SOLO para programar
- Todo lo demas (investigar, analizar logs, monitoring) con modelos gratuitos
- ANTES de implementar: Perplexity para investigar
- Logs largos: Gemini para analizar
