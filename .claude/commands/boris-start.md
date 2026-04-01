---
name: boris-start
description: Inicia una tarea con metodología Boris completa — tag, investigación gratuita, teams, OpenClaw
argument-hint: "<nombre-tarea> [descripción opcional]"
---

# Boris Start — Automatización de Metodología

**Tarea**: $ARGUMENTS

## Paso 0: Identificar contexto

Detecta automáticamente:
- Proyecto actual: `git remote -v | head -1` y `basename $(pwd)`
- Rama actual: `git branch --show-current`
- Directorio: `pwd`

## Paso 1: Sincronizar y crear punto de retorno

```bash
git pull origin $(git branch --show-current)
git tag pre-$ARGUMENTS_SLUG -m "Punto de retorno antes de: $ARGUMENTS"
git push origin pre-$ARGUMENTS_SLUG
```

Si el tag ya existe, usa `pre-$ARGUMENTS_SLUG-$(date +%H%M)`.

## Paso 2: Investigar con modelos GRATUITOS en paralelo

ANTES de planificar, lanza 3 investigaciones en paralelo (curl en background):

**2A — Perplexity (búsqueda web):**
```bash
curl -s http://localhost:8318/v1/chat/completions \
  -H "Authorization: Bearer sk-GazR6oQwVsbxdaMK5PE_Ht-88lUn3IALdwtwyZg6eWo" \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"sonar-pro\", \"messages\": [{\"role\": \"user\", \"content\": \"Mejores prácticas y soluciones actuales para: $ARGUMENTS\"}]}" \
  -o /tmp/boris-research-perplexity.json &
```

**2B — DeepSeek R1 (razonamiento profundo):**
```bash
curl -s http://localhost:8317/v1/chat/completions \
  -H "Authorization: Bearer sk-GazR6oQwVsbxdaMK5PE_Ht-88lUn3IALdwtwyZg6eWo" \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"cliproxy/deepseek-r1\", \"messages\": [{\"role\": \"user\", \"content\": \"Analiza este problema y propón un plan de implementación paso a paso: $ARGUMENTS. Contexto: proyecto $(basename $(pwd)), stack del proyecto.\"}]}" \
  -o /tmp/boris-research-deepseek.json &
```

**2C — Gemini (documentación):**
```bash
curl -s http://localhost:8317/v1/chat/completions \
  -H "Authorization: Bearer sk-GazR6oQwVsbxdaMK5PE_Ht-88lUn3IALdwtwyZg6eWo" \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"cliproxy/gemini-2.5-pro\", \"messages\": [{\"role\": \"user\", \"content\": \"Qué consideraciones técnicas, riesgos y dependencias hay para: $ARGUMENTS\"}]}" \
  -o /tmp/boris-research-gemini.json &
```

```bash
wait  # Esperar las 3 respuestas
```

Extraer respuestas:
```bash
PERPLEXITY=$(python3 -c "import json; print(json.load(open('/tmp/boris-research-perplexity.json'))['choices'][0]['message']['content'][:2000])" 2>/dev/null || echo "Sin respuesta")
DEEPSEEK=$(python3 -c "import json; print(json.load(open('/tmp/boris-research-deepseek.json'))['choices'][0]['message']['content'][:2000])" 2>/dev/null || echo "Sin respuesta")
GEMINI=$(python3 -c "import json; print(json.load(open('/tmp/boris-research-gemini.json'))['choices'][0]['message']['content'][:2000])" 2>/dev/null || echo "Sin respuesta")
```

Mostrar resumen de investigación al arquitecto.

## Paso 3: Planificar waves

Con la investigación de los 3 modelos, divide la tarea en waves:
- **Wave 1**: Tareas independientes (paralelo)
- **Wave 2**: Tareas que dependen de Wave 1
- **Wave N**: Continuar hasta completar

Cada wave debe tener:
- Archivos a modificar
- Agente responsable (Agent model="sonnet")
- Verificación esperada

## Paso 4: Registrar en OpenClaw

```bash
curl -s -X POST http://localhost:9091/api/plans/register \
  -H "Content-Type: application/json" \
  -d "{
    \"plan_id\": \"$(basename $(pwd))-$(date +%Y%m%d-%H%M)\",
    \"project\": \"$(basename $(pwd))\",
    \"task\": \"$ARGUMENTS\",
    \"waves\": $(echo $WAVE_COUNT),
    \"status\": \"in_progress\",
    \"tag\": \"pre-$ARGUMENTS_SLUG\"
  }" 2>/dev/null || echo "OpenClaw no disponible — continuar sin registro"
```

## Paso 5: Ejecutar waves con Agent Teams

Si la tarea toca más de 2 archivos:
1. Crear un Agent por cada tarea de la wave
2. model="sonnet" SIEMPRE — NUNCA opus para ejecución
3. Pasar a cada agente la investigación relevante del Paso 2
4. Ejecutar waves en paralelo donde sea posible
5. Verificar entre waves

Si la tarea es simple (1-2 archivos):
1. Un solo Agent model="sonnet" con toda la info

## Paso 6: Verificación obligatoria (Boris Loop)

ANTES de reportar completado, el agente ejecutor DEBE probar:
- ¿Compila? → `build output` o `python3 -c "import modulo"`
- ¿Tests pasan? → `test output`
- ¿Endpoint responde? → `curl output`
- ¿Proceso corre? → `ps/systemctl/docker output`
- ¿Archivo existe y tiene contenido? → `wc -l archivo`

Si CUALQUIER verificación falla → corregir ANTES de continuar.

## Paso 7: Commit + Push + Documentar

```bash
# Commit específico
git add [archivos-modificados]
git commit -m "[TAG] $ARGUMENTS

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Push
git push origin $(git branch --show-current)

# Documentar en .brain/history.md
# Formato:
### [FECHA] - Arquitecto [proyecto] — $ARGUMENTS
**Estado**: Completado
**Archivos modificados**: [lista]
**Cambios**: [resumen]
**Verificación**: [evidencia real]
**Investigación usada**: Perplexity + DeepSeek R1 + Gemini
**Pendiente**: [si hay algo]
```

## Paso 8: Cerrar en OpenClaw

```bash
curl -s -X PUT http://localhost:9091/api/plans/close \
  -H "Content-Type: application/json" \
  -d "{
    \"plan_id\": \"$(basename $(pwd))-$(date +%Y%m%d-%H%M)\",
    \"status\": \"completed\",
    \"evidence\": \"[resumen de verificación]\"
  }" 2>/dev/null || echo "OpenClaw no disponible"
```

## Paso 9: Reportar al usuario

Resumen en 5 líneas:
1. Qué se hizo
2. Qué modelos gratuitos se usaron (y qué ahorraron)
3. Cuántos agentes Sonnet se usaron
4. Evidencia de verificación
5. Qué queda pendiente (si algo)

---

## REGLAS INQUEBRANTABLES

- **Opus NUNCA escribe código** — solo lee, planifica, delega
- **Sonnet ejecuta** — es el que usa Edit/Write/Bash
- **Modelos gratuitos primero** — investigar ANTES de gastar tokens Claude
- **Sin evidencia NO está completo** — Boris Loop obligatorio
- **Un commit por unidad lógica** — no acumular cambios
- **Si falla, rollback**: `git reset --hard pre-$ARGUMENTS_SLUG`
