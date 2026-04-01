---
name: sypnose-create-plan
description: Protocolo obligatorio del Service Manager para crear y enviar planes a arquitectos. Usar SIEMPRE antes de enviar trabajo a cualquier arquitecto. Incluye plantilla KB BUS, verificacion de calidad, envio, y triage. Invocar cuando Carlos pida crear tareas, planes, prompts para agentes, o mandar trabajo a arquitectos.
user_invocable: true
---

# SYPNOSE — Crear Plan para Arquitecto

## REGLA DE HIERRO
NUNCA enviar trabajo a un arquitecto sin seguir estos 6 pasos.
NUNCA saltarse pasos. Carlos aprueba ANTES de enviar.

## LEY DE VERIFICACION ENTRE WAVES (APRENDIDA EN PRODUCCION)
**El agente NO puede pasar al siguiente wave sin demostrar que el anterior funciona.**

Cada wave debe terminar con un bloque así:

```
### VERIFICACION WAVE N (OBLIGATORIO — no pasar a Wave N+1 sin esto)
Comando: [comando bash concreto]
Resultado esperado: [output exacto]
Si falla → PARAR. No hagas más cambios. Reporta al SM con el error exacto y espera instrucciones.
```

**Por qué existe esta ley:**
El 27-Mar-2026, un arquitecto de GestoriaRD se saltó Boris y la verificación entre waves.
Resultado: cambios en cascada, BD modificada sin código desplegado, SaaS caído, horas de reparación.
**Un agente que no verifica su trabajo antes de continuar viola Boris y su trabajo se rechaza.**

## PASO 1 — Investigar antes de crear
Antes de escribir el plan:
1. `kb_search` del tema → leer qué se hizo antes, lecciones, errores
2. Leer `.brain/history.md` del arquitecto destino → qué hizo últimamente
3. `git log --oneline -5` del repo → últimos commits
4. NO crear trabajo repetido o que contradiga lo que ya hizo

## PASO 2 — Crear el plan con plantilla completa

### Estructura KB BUS (obligatoria en la primera línea):
```
STATUS: pending | TO: [arquitecto] | FROM: sm-claude-web | TIMESTAMP: [ISO8601] | PRIORIDAD: [alta/media/baja]
```

### 6 etiquetas obligatorias (Gemini Gate las valida):
```
PLAN: [descripción en una línea de qué se va a hacer]
TAREA: [qué debe ejecutar el arquitecto, concreto]
MODELO: [modelo principal]. Sub-agentes: [modelo sub-agentes]
BORIS: git pull origin main + git tag pre-[nombre]-[fecha]
VERIFICACION: [comando bash concreto que demuestra que funciona]
EVIDENCIA: [qué archivos/outputs deben existir al terminar]
KB: kb_save key=resultado-[arquitecto]-[nombre]-[fecha] category=notification project=[proyecto]
```

### Cuerpo del plan (después del BUS):
```markdown
# [Título del trabajo]
Fecha: [fecha]
Proyecto: [proyecto]
Prioridad: [alta/media/baja]

## Contexto
[Por qué se hace esto. Qué existe ya. Qué falló antes si aplica.]

## Antes de empezar
cd [directorio]
git pull origin $(git branch --show-current)
git tag pre-[tarea]-[fecha] -m "[descripción]"
git push origin pre-[tarea]-[fecha]

## Qué hacer
[Dividir en waves si hay más de 2 pasos independientes]

### Wave 1 — [nombre] (paralelo)
[tareas sin dependencias entre sí]

### VERIFICACION WAVE 1 (OBLIGATORIO — no pasar a Wave 2 sin esto)
[ ] Comando: [comando concreto]
[ ] Resultado esperado: [output exacto]
[ ] Si falla → PARAR. No continuar. Reportar al SM via kb_save.

### Wave 2 — [nombre] (depende de Wave 1)
[tareas que dependen de Wave 1]

### VERIFICACION WAVE 2 (OBLIGATORIO)
[ ] Comando: [comando concreto]
[ ] Resultado esperado: [output exacto]

## Despliegue (OBLIGATORIO — SOLO esta forma, nunca improvisar)
[Especificar EXACTAMENTE cómo desplegar. Si no está aquí, NO desplegar.]

Ejemplo GestoriaRD:
```
git push origin main
# Coolify detecta el push y despliega automáticamente (~3-4 min)
# NUNCA hacer docker build manual
# NUNCA tocar nginx
# Verificar en Coolify dashboard que el deploy terminó
# Verificar: curl http://127.0.0.1:3080/ → 200
```

## LEY: AL TERMINAR EL PLAN — PARAR Y REPORTAR

**Cuando termines TODO lo que dice este plan, haz EXACTAMENTE esto:**

```
kb_save key=resultado-[nombre]-[fecha] category=notification project=[proyecto]
value="
DONE: [qué ejecutaste exactamente]
COMMITS: [hashes]
VERIFICADO: [qué comprobaste y cómo]
DESCUBRIMIENTOS: [cosas útiles que encontraste — bugs, mejoras, riesgos]
INQUIETUDES: [qué te preocupa del estado actual]
SUGERENCIAS: [qué harías tú como próximo paso, con detalle]
"
```

**Luego pregúntate y responde en el KB:**
- ¿Quedó algo por hacer que no estaba en el plan?
- ¿Encontré algo que se puede mejorar?
- ¿Hay algo que me preocupa del estado actual?
- ¿Qué haría yo como próximo paso si pudiera decidir?

**Después de responder: PARAR. No hagas nada más.**

### Por qué los descubrimientos van al KB (no a producción)
Mientras ejecutas el plan, vas a notar cosas: bugs, mejoras, riesgos, oportunidades.
Eso es VALIOSO. El SM lo usa para planificar el siguiente paso.
PERO actuar en esos descubrimientos sin un nuevo plan = improvisar = caos.

**La regla es:**
- ✅ Notas algo → lo escribes en DESCUBRIMIENTOS del KB
- ✅ Tienes una sugerencia → la escribes en SUGERENCIAS del KB
- ❌ Actúas en ello sin que el SM cree un nuevo plan → PROHIBIDO

**Por qué existe esta ley:**
GestoriaRD 28-Mar-2026: arquitecto terminó el plan y siguió haciendo docker builds manuales, tocó nginx, confundió containers, casi pierde producción. Nada de eso estaba en el plan. Los descubrimientos del arquitecto ERAN válidos — el error fue actuar en ellos sin esperar el siguiente plan.

### VERIFICACION ENTRE WAVES (Boris Cherny)
Boris Cherny exige evidencia concreta antes de pasar al siguiente paso.
El arquitecto NO declara "listo" — demuestra con output real.

**Formato obligatorio de verificación:**
```
### ✅ VERIFICACION WAVE N — COMPLETADA
Comando ejecutado: [comando exacto]
Output real: [copiar el output, no parafrasear]
Conclusión: [funciona / falla / parcial]
→ [si funciona: paso a Wave N+1] [si falla: PARAR y reportar]
```

**PROHIBIDO:**
- "Debería funcionar" → NO ES EVIDENCIA
- "Lo verifiqué" sin output → NO ES EVIDENCIA
- "Parece que está bien" → NO ES EVIDENCIA
- Pasar al siguiente wave sin verificar el anterior

## LEY DE EVIDENCIA: SIN EVIDENCIA NO HAY TRABAJO (28-Mar-2026)

**Todo trabajo debe terminar con EVIDENCIA CONCRETA de que funciona.**
Sin evidencia, el trabajo NO EXISTIÓ. El SM lo rechaza.

Tipo de evidencia según tipo de cambio:

| Cambio | Evidencia obligatoria |
|---|---|
| Config/scripts/manual | Screenshot o output de que el servicio corre, logs del resultado |
| Cambio en el SaaS (código) | Acceder al SaaS via Chrome/curl, navegar las rutas afectadas, probar que todo funciona |
| Seguridad | Demostrar que cada medida funciona: curl con/sin auth, RLS con/sin permisos, rate limit activándose |
| Base de datos | Query SELECT que confirme los datos correctos |
| Docker/deploy | docker ps + curl health + verificar que la app responde correctamente |
| API endpoint | curl -X METHOD url → response con status code correcto |

**El plan SIEMPRE debe incluir una sección de evidencia al final:**
```
## Evidencia (OBLIGATORIO — sin esto el trabajo se rechaza)
Adjuntar output REAL (copiar/pegar, no parafrasear) de:
1. [verificación específica 1]
2. [verificación específica 2]
3. [verificación específica N]

Formato del kb_save resultado:
EVIDENCIA:
  - Comando: [exacto]
    Output: [copiar el output real]
  - Comando: [exacto]
    Output: [copiar el output real]
```

## Reglas críticas
1. [Regla específica del proyecto]
2. Si algo falla — STOP. No hagas más cambios. Reporta al SM con el error exacto y espera instrucciones.
3. Mejora este documento. Añade lo que falte. Si encuentras algo mal o un falso positivo, corrígelo. Tú conoces el código mejor.
4. Cuando termines el plan → kb_save con resultado + inquietudes → PARAR. No actúes fuera del plan.

## Criterios de éxito
- [criterio medible 1]
- [criterio medible 2]

## Verificación final
[comando 1] — debe retornar [resultado esperado]
[comando 2] — debe retornar [resultado esperado]

## Entrega
git add [archivos específicos]
git commit -m "[TAG] descripción"
git push origin main
kb_save key=resultado-[arquitecto]-[nombre]-[fecha] value="[resumen]" category=notification project=[proyecto]

Modelo: [modelo]. Sub-agentes: [modelo].
MODO AUTONOMO: [qué ejecutar sin preguntar]. PARAR en: [qué requiere aprobación de Carlos].
```

## PASO 3 — Mostrar a Carlos (NO guardar en KB todavía)
- Presentar el plan completo en el chat
- Carlos lo lee y dice "okey" o pide cambios
- NUNCA enviar sin que Carlos lo apruebe

## PASO 4 — Guardar en KB
```
kb_save key=task-[arquitecto]-[nombre]-[fecha] category=task project=[proyecto]
```

## PASO 5 — Enviar + Gemini valida (OBLIGATORIO)

**Para arquitectos en Contabo** — sm-tmux integra Gemini Gate internamente:
```bash
sm-tmux send [sesion] "kb_read key=task-[arquitecto]-[nombre]-[fecha] project=[proyecto] && echo EJECUTA"
sm-tmux approve [sesion]
```
`sm-tmux approve` ES el Gemini Gate — valida las 6 etiquetas. Si rechaza → corregir plan → volver a Paso 4.
`&& echo EJECUTA` al final es obligatorio. Sin eso el arquitecto lee y espera en vez de ejecutar.

> ANTI-PATRON: hacer curl a CLIProxy para "pre-validar" antes de sm-tmux — es redundante. Solo hay UN Gemini Gate: sm-tmux approve.
> ANTI-PATRON: usar tmux send-keys directo para tareas — bypasea Gemini Gate.

**Para JobHunter (local Windows, unico caso sin sm-tmux):**
Decirle a Carlos que abra la sesión de JobHunter y le diga:
> "Lee el KB: `task-[nombre]-[fecha]` proyecto [proyecto]. Ejecuta."

## PASO 6 — Monitorear y hacer QA
Verificar cuando el arquitecto termine:
1. `kb_search query="resultado-[arquitecto]-[nombre]"` → leer su reporte
2. Verificar commits: `git log --oneline -3` en el repo
3. Verificar el criterio de éxito del plan
4. Si pasa QA → registrar en KB como completado
5. Si falla QA → crear plan de corrección (volver al paso 1)

---

## MATRIZ DE MODELOS (consultar antes de crear el prompt)

| Tipo de trabajo | Modelo |
|---|---|
| Código core crítico (Rust, Python trading) | claude-opus-4-6 |
| Features complejas, arquitectura | claude-opus-4-6 |
| Código general, refactoring | claude-sonnet-4-6 |
| Scripts bash, automatización | qwen3-coder-plus |
| Análisis de docs largos | gemini-2.5-pro |
| Investigación web | perplexity |
| Sub-agentes generales | sonnet (NUNCA opus) |

**Regla**: SM decide modelos. Arquitectos NO eligen.
**Meta**: 80%+ trabajo con modelos gratuitos.

---

## REGLA DE MEJORA (siempre al final del prompt)
> "Mejora este documento. Añade lo que falte. Si encuentras algo mal o un falso positivo, corrígelo. Tú conoces el código mejor que nosotros."

---

## CUANDO ALGO FALLA
Si el arquitecto reporta un error:
1. STOP — no crear más trabajo encima del problema
2. Diagnosticar: leer el error exacto
3. Un solo cambio para corregir
4. Verificar que ese cambio funciona
5. Luego continuar

**Si el arquitecto entra en pánico y hace cambios en cascada:**
Mandarle: "PARA. No hagas más cambios. Dime exactamente qué error ves."

---

## TRIAGE DE RESPUESTAS DEL ARQUITECTO
Cuando llega una notificación KB:
- **URGENTE** → crear plan nuevo inmediato, informar a Carlos
- **MEJORA** → crear plan prioridad media
- **DECISIÓN** → presentar opciones a Carlos, NO crear plan sin su OK
- **INFORMATIVO** → resumir a Carlos en 3 líneas, archivar en KB
