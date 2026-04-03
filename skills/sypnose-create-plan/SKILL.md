---
name: sypnose-create-plan
description: >
  Protocolo unificado del SM para crear y enviar planes a arquitectos.
  Usar SIEMPRE antes de enviar trabajo. Incluye KB BUS, 6 etiquetas Gemini Gate,
  Boris por wave, plantilla, checklist, modelos, envio, QA y triage.
  Unifica sm-protocol v4.1 + sypnose-create-plan anterior.
triggers:
  - "plan"
  - "crear plan"
  - "enviar tarea"
  - "task"
  - "arquitecto"
  - "jobhunter"
  - "sypnose-create-plan"
  - "sm-protocol"
---

# PROTOCOLO SM — CREAR Y ENVIAR PLAN

SIGUE ESTOS 6 PASOS EN ORDEN. NO SALTES NINGUNO.
PARA DESPUES DE CADA PASO Y ESPERA LO QUE SE INDICA.

---

## PASO 1 DE 6: INVESTIGAR

Ejecuta ANTES de escribir nada:

```
1. kb_search del tema/proyecto → leer lecciones y errores previos
2. kb_list category=task project={proyecto} → verificar que no hay duplicados
3. Consultar la MATRIZ DE MODELOS (al final de este skill) → que modelo asignar
4. BUSCAR EN MEMORIA Y KB ANTES DE ESCRIBIR:
   - memory/ → leer archivos del proyecto relevantes a la tarea
   - kb_search → buscar info que ya tenemos sobre el tema
   - MEMORY.md → indice de toda la memoria disponible
   - SI el arquitecto propone mejoras: buscar en memoria y KB
     que info tenemos sobre esas mejoras ANTES de crear el plan.
     Incluir esa info en el plan para que el arquitecto no
     investigue lo que ya sabemos.
   - NUNCA crear plan sobre algo que ya conocemos sin incluir
     nuestro conocimiento previo.
5. SIN EVIDENCIA BORIS NO SE HIZO EL TRABAJO:
   - CADA wave, CADA fix, CADA cambio necesita evidencia real
   - Frontend: Chrome MCP screenshot mostrando resultado
   - Backend: curl con output real pegado
   - Tests: output con PASSED/FAILED
   - Config: cat/grep del archivo mostrando el cambio
   - Si el arquitecto dice "funciona" sin pegar output → RECHAZAR
   - Sin evidencia concreta, el trabajo NUNCA EXISTIO
```

### REGLA DE ORO: Sin evidencia no se hizo el trabajo
- Boris en CADA wave, CADA fix, CADA cambio
- Sin screenshot, sin output de comando, sin curl → NO EXISTE
- El arquitecto DEBE pegar output real, no decir "funciona"
- Si una wave no tiene evidencia concreta → RECHAZAR

Cuando termines la investigacion → pasar a Paso 2.

---

## PASO 2 DE 6: ESCRIBIR EL PLAN Y MOSTRARLO A CARLOS

Escribe el plan con TODAS estas partes. Si falta alguna, Gemini lo rechaza.

### A) Wrapper KB BUS (encabezado)
```
STATUS: pending | TO: {destino} | FROM: sm-claude-web | TIMESTAMP: {ISO8601} | PRIORIDAD: {alta|media|baja}
```

### B) 6 Etiquetas Gemini Gate
```
PLAN:          [descripcion del plan]
TAREA:         [min 10 chars — que hacer]
MODELO:        [de la matriz — sonnet para subagentes, NUNCA opus]
BORIS:         [git pull + git tag pre-{tarea} + BORIS POR WAVE (ver seccion)]
VERIFICACION:  [comando concreto: curl, test, ls — NO frases vagas]
EVIDENCIA:     [output esperado, min 10 chars]
KB:            [kb_save key=resultado-{tarea} cuando termine]
```

### C) Prompt para el arquitecto

```
# [Titulo corto de la tarea]
Fecha: YYYY-MM-DD
Proyecto: [nombre] ([path en servidor])
Prioridad: BAJA | NORMAL | ALTA | CRITICA

## Contexto
[Por que existe esta tarea. 2-3 lineas max.]

## Objetivo
[Que debe quedar funcionando. Concreto y verificable.]

## Antes de empezar
cd ~/[PROYECTO]
git pull origin $(git branch --show-current)
[comando test: cargo test | npm test | pytest | bash -n scripts/*.sh]
git tag pre-[nombre-tarea]-[fecha] -m "Antes de [tarea]"
git push origin pre-[nombre-tarea]-[fecha]

## Que construir

### Wave 1 — [nombre descriptivo]
[Que hacer en esta wave. QUE, no COMO.]

#### BORIS WAVE 1
- Commit: git add [archivos wave 1] && git commit -m "[TAG] wave 1: [desc]"
- Verificacion: [comando concreto con output esperado]
- Evidencia frontend (si aplica): Chrome MCP → navegar → screenshot → confirmar visual
- Evidencia backend (si aplica): curl [endpoint] → response esperada
- Quien decide si pasa: [arquitecto (tecnico) | SM (calidad) | Carlos (estrategia)]
- Si falla: PARAR. git reset --hard pre-[tarea]. Reportar al SM via kb_save.
- Si pasa: continuar Wave 2.

### Wave 2 — [nombre descriptivo]
[Que hacer en esta wave.]

#### BORIS WAVE 2
- Commit: git add [archivos wave 2] && git commit -m "[TAG] wave 2: [desc]"
- Verificacion: [comando concreto]
- Evidencia frontend/backend: [como arriba]
- Quien decide si pasa: [quien]
- Si falla: PARAR. Rollback a commit wave 1. Reportar al SM.
- Si pasa: continuar Wave N o Entrega.

[Repetir por cada wave que necesite el plan]

## Criterio de exito
- [ ] [Criterio 1 con comando y output esperado]
- [ ] [Criterio 2]

## Entrega
git add [archivos]
git commit -m "[TAG] descripcion final"
git push origin $(git branch --show-current)

kb_save key="resultado-[tarea]" value="[resumen]" category="notification" project="[proyecto]"

Notificar al SM:
kb_save key="notify-sm-[nombre]" category="notification" project="[proyecto]" value="DONE: [tarea] | TO: sm-claude-web | FROM: [agente] | RESUMEN: [resultado]"

Documentar en .brain/history.md.

## Al terminar
1. kb_save con resumen de lo que hiciste
2. Reporta: que mas podria mejorar? Minimo 3 sugerencias. OBLIGATORIO.

Modelo: [de la matriz]
Fallback: [de la matriz]
Sub-agentes: model sonnet. NUNCA opus.
MODO AUTONOMO: Ejecuta todo sin preguntar. NO pidas confirmacion. NO preguntes "ejecuto?". Lee el plan y hazlo. Si ves algo que mejorar, mejoralo directamente sin consultar.
```

### D) Checklist pre-envio (verificar ANTES de mostrar a Carlos)
- [ ] 1 proyecto, 1 tarea (nunca multiples repos)
- [ ] Auto-contenido (todo dentro del prompt)
- [ ] ANTES DE EMPEZAR: git pull + test + git tag + git push tag
- [ ] ENTREGA: git add + git commit + git push + kb_save
- [ ] VERIFICACION: comandos concretos con output esperado
- [ ] Criterios medibles (no frases vagas)
- [ ] Wrapper KB BUS completo (6 campos)
- [ ] 6 etiquetas Gemini presentes
- [ ] Modelo asignado de la matriz
- [ ] **BORIS POR WAVE: cada wave tiene commit + verificacion + evidencia + rollback**
- [ ] **QUIEN DECIDE en cada wave (arquitecto/SM/Carlos)**
- [ ] **Evidencia frontend si toca UI (Chrome MCP + screenshot)**
- [ ] **Evidencia backend si toca API (curl + response)**
- [ ] **"Ejecuta todo sin preguntar" al final del prompt**
- [ ] Notificacion al SM via kb_save category=notification

### MOSTRAR EL PLAN A CARLOS EN PANTALLA.
### PARAR AQUI. NO HACER NADA MAS HASTA QUE CARLOS DIGA "OKEY".

---

## PASO 3 DE 6: CARLOS DICE OKEY → GUARDAR EN KB

Solo cuando Carlos diga "okey", "dale", "ok", "si":

```
kb_save key="task-{agente}-{nombre}" value="{plan completo}" category="task" project="{proyecto}"
```

Si Carlos pide cambios → corregir → volver a mostrar → esperar okey otra vez.

---

## PASO 4 DE 6: ENVIAR + GEMINI VALIDA

### Para arquitectos en Contabo (sm-tmux = Gemini Gate integrado):
```
sm-tmux send {sesion} "kb_read key=task-{agente}-{nombre} project={proyecto} && echo EJECUTA"
sm-tmux approve {sesion}
```
`sm-tmux` YA INCLUYE GEMINI GATE internamente. No hacer curl adicional. No hay "pre-validacion".
Gemini lee KB y valida las 6 etiquetas. Si rechaza → corregir plan → volver a Paso 3.
**IMPORTANTE: "EJECUTA" al final. Sin esto el arquitecto lee y pregunta. Se pierde el automatismo.**

> ANTI-PATRON: hacer curl a CLIProxy para "validar antes de enviar" — es redundante. sm-tmux approve ES el Gemini Gate. Solo hay UN Gemini Gate.

### Para JobHunter LOCAL (unico caso sin sm-tmux):
Solo cuando el arquitecto es JobHunter en Windows (sin acceso a sm-tmux del servidor):
```
curl -s -H "Authorization: Bearer [KEY de kb_read key=cliproxy-auth-config project=sypnose]" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8317/v1/chat/completions \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"system","content":"Valida este plan. Verifica 6 etiquetas: PLAN, TAREA, MODELO, BORIS, VERIFICACION, EVIDENCIA, KB. Verifica Boris por wave. Si falta algo RECHAZA."},{"role":"user","content":"[plan]"}],"max_tokens":200}'
```

Cuando Gemini apruebe → decir a Carlos: "Gemini aprobo."

---

## PASO 5 DE 6: KB SAVE FINAL

```
kb_save key="task-{agente}-{nombre}-final" value="{plan aprobado}" category="task" project="{proyecto}"
```

---

## PASO 6 DE 6: ENVIAR AL ARQUITECTO

### Para arquitectos en Contabo:
El plan ya fue enviado en Paso 4 con sm-tmux send (con "EJECUTA" al final). Verificar que llego.

### Para arquitectos locales:
Decir a Carlos:
```
Plan listo en KB. Cuando abras el arquitecto, dile:
kb_read key=task-{agente}-{nombre}-final project={proyecto}
```
**IMPORTANTE: Despues del kb_read, decirle al arquitecto: "Ejecuta."**
Sin esa palabra, el arquitecto lee el plan y espera. Con ella, ejecuta inmediato.

---

## DESPUES: QA (cuando el arquitecto dice "terminado")

1. Build/Tests pasan?
2. Commits atomicos con tag correcto? (un commit POR WAVE)
3. .brain/ actualizado?
4. CADA criterio de exito verificado?
5. Visual si hay UI? (Chrome MCP)
6. Backend si hay API? (curl)

APROBADO → kb_save category=report, TodoWrite completed
RECHAZADO → kb_save feedback, arquitecto corrige, repetir

---

## DESPUES: CICLO DE MEJORAS (OBLIGATORIO — no saltar)

### Paso 1: Preguntar mejoras
Crear plan completo con las 6 etiquetas Gemini (como cualquier otro plan) pidiendo mejoras.
Guardarlo en KB y enviarlo via sm-tmux send (SIN --force, pasa por Gemini Gate como todo).
```
kb_save key="pregunta-{agente}-mejoras-{fecha}" value="{plan completo con 6 etiquetas}" category="task" project="{proyecto}"
sm-tmux send {sesion} "kb_read key=pregunta-{agente}-mejoras-{fecha} project={proyecto} && echo EJECUTA"
```
PROHIBIDO: --force. TODO pasa por Gemini Gate sin excepciones.

### Paso 2: Recibir y crear planes con TODAS las mejoras
No hay mejoras menores — todas se atienden.

### Paso 3: Repetir hasta "Todo perfecto, no encuentro mejoras"

### Reglas:
- NUNCA interrumpir al arquitecto MIENTRAS trabaja — preguntar DESPUES
- NUNCA ignorar sugerencias — todas se convierten en planes
- El arquitecto responde via kb_save (no solo tmux)

---

## DESPUES: TRIAGE (cuando el arquitecto responde sin que le preguntes)

kb_list category=notification → kb_read → clasificar:

| Tipo | Accion |
|------|--------|
| URGENTE | Plan nuevo inmediato (6 pasos), informar Carlos |
| MEJORA | Plan prioridad media (6 pasos) |
| DECISION | Presentar opciones a Carlos, NO actuar sin OK |
| INFORMATIVO | Resumir 3 lineas, archivar kb_save category=report |

---

## ANTI-PATRONES (NUNCA hacer)

1. Mandar plan sin las 6 etiquetas
2. Mandar plan sin Boris por wave
3. Mandar plan sin "quien decide" en cada wave
4. kb_save ANTES de que Carlos apruebe
5. Usar tmux send-keys directo para tareas (siempre sm-tmux)
6. Mandar 2+ tareas al mismo agente simultaneamente
7. Usar opus para sub-agentes
8. Saltarse Gemini Gate bajo presion
9. Decidir solo si requiere estrategia
10. Ignorar sugerencias del arquitecto
11. Texto largo por tmux send-keys (causa barra amarilla)
12. No guardar lecciones en KB
13. Investigar en vez de delegar
14. Programar en vez de coordinar

---

## REFERENCIAS

### Arquitecto → Sesion tmux → Path
| TO: | Sesion tmux | Path |
|-----|------------|------|
| seguridad | seguridad-server | ~/seguridad-server |
| gestoriard | gestion-contadoresrd | ~/gestoriard-widget-clean |
| dgii | dgii | ~/dgii-scraper |
| iatrader | IATRADER | ~/IATRADER |
| iatrader-rust | iatrader-rust | ~/IATRADER-RUST |
| facturaia | FacturaIA | ~/eas-builds/FacturaScannerApp |
| oc-manual | oc-manual | ~/oc-manual |
| JobHunter (LOCAL) | — | C:\carlos |

### Tags de commit
[FEAT] nueva funcionalidad | [FIX] bug | [REFACTOR] reestructurar
[DOCS] documentacion | [TEST] tests | [INFRA] config/deploy | [BRAIN] estado

### Quien decide que
| Tipo de decision | Quien |
|---|---|
| Tecnico (build, test, config, implementacion) | Arquitecto decide solo |
| Calidad (pasa QA o no, cumple criterios) | SM decide |
| Estrategia (que feature, que prioridad, que proyecto) | Carlos decide |
| Seguridad (puertos, firewall, acceso, credenciales) | Carlos decide |
| Modelo a usar | SM decide (consulta matriz) |

### CLIProxy — Gemini Gate desde Windows
```
API Key: kb_read key=cliproxy-auth-config project=sypnose
Endpoint: http://localhost:8317/v1/chat/completions
Requiere: tunel SSH activo (sypnose-tunnels MCP)
```

### Routing de modelos (via CLIProxy :8317)
| Trabajo | Modelo | Alternativa | Costo |
|---------|--------|-------------|-------|
| Codigo critico (Rust, Python core) | claude-sonnet-4-6 | qwen3-coder-plus | PAGO |
| Codigo no-critico | qwen3-coder-plus | gemini-2.5-flash | GRATIS |
| Bash/shell/scripts | qwen3-coder-flash | llama-3.3-70b | GRATIS |
| Frontend | gemini-2.5-pro | qwen3-coder-plus | PAGO |
| Testing/QA | claude-sonnet-4-6 | qwen3-coder-plus | PAGO |
| Incidentes | claude-sonnet-4-6 | deepseek-r1 | PAGO |
| Integraciones | qwen3-coder-plus | gemini-2.5-flash | GRATIS |
| Seguridad | deepseek-v3.2 | deepseek-r1 | GRATIS |
| Documentacion | qwen3-coder-plus | glm-4.6 | GRATIS |
| Monitoreo 24/7 | kimi-k2 | deepseek-v3.2 | GRATIS |
| Investigacion web | sonar-pro | sonar | INCLUIDO |
| Razonamiento complejo | claude-opus-4-6 | deepseek-r1 | PAGO |
| Razonamiento largo | sonar-reasoning | deepseek-r1 | GRATIS |
| Archivos grandes | gemini-2.5-pro | cerebras-qwen3-235b | PAGO |
| Tareas rapidas | gemini-2.5-flash | gemini-2.5-flash-lite | PAGO |
| Vision/OCR | qwen3-vl-plus | gemini-2.5-flash | GRATIS |
| Debugging | deepseek-r1 | deepseek-v3.2 | GRATIS |
| Refactoring | qwen3-coder-plus | qwen3-coder-flash | GRATIS |

Meta: 80%+ gratis. Claude SOLO para critico.

### Al abrir sesion (SIEMPRE)
1. `kb_list category=notification` → que paso
2. `boris_get_state` → estado Boris
3. `kb_read key=cliproxy-auth-config project=sypnose` → tener Gemini Gate listo

### SSH directo SOLO para
- `sm-tmux capture/list/status` (lectura)
- Debug: `cat`, `grep`, `systemctl`
- Emergencias: reiniciar servicios
- **NUNCA** para tareas reales → siempre sm-tmux send + approve
