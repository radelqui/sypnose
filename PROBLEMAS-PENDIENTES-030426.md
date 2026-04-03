# PROBLEMAS PENDIENTES — Sypnose v5.2 (03-Abr-2026)

Encontrados durante test E2E post-instalacion.
El instalador y manual estan en: radelqui/sypnose (GitHub)
Manual: SYPNOSE-v52-MANUAL-INSTALACION.md (1653 lineas, 22 secciones)

---

## PROBLEMA 1: Heartbeat no se actualiza (tick=1 siempre)

**Archivo:** /opt/sypnose/core/loop.js (linea ~651)
**Sintoma:** curl localhost:18791/api/read?key=heartbeat:coordinator muestra tick=1, uptime=2 siempre.
El coordinator lleva horas corriendo pero el heartbeat muestra datos del primer tick.

**Causa probable:** kbSave hace UPSERT (ON CONFLICT UPDATE) pero el value es un JSON stringificado.
Si el key "heartbeat:coordinator" ya existe, deberia actualizar. Verificar:
1. Que el coordinator realmente llega a la linea del kbSave heartbeat cada tick
2. Que el kbSave no falla silenciosamente (catch vacio)
3. Que el UPSERT actualiza el value (no solo el access_count)

**Como diagnosticar:**
```bash
# Ver si el value cambia entre 2 lecturas separadas por 30s:
curl -s 'localhost:18791/api/read?key=heartbeat:coordinator' | python3 -m json.tool | grep value
sleep 35
curl -s 'localhost:18791/api/read?key=heartbeat:coordinator' | python3 -m json.tool | grep value
# Si el tick y ts son iguales, el coordinator NO esta escribiendo
```

**Como arreglar:**
Si el kbSave falla silenciosamente, agregar log:
```javascript
// En core/loop.js, despues del kbSave heartbeat:
const hbResult = await kbSave("heartbeat:coordinator", {...});
if (!hbResult) console.error('[WARN] heartbeat kbSave failed');
```

**En servidor nuevo:** Verificar heartbeat 1 minuto despues de arrancar el coordinator.
Si tick=1 permanece, el kbSave tiene un bug.

---

## PROBLEMA 2: oc-manual en clients.json pero sin tmux

**Sintoma:** El coordinator muestra 7 agentes en budgets (incluyendo oc-manual),
pero tmux list-sessions solo muestra 6. La sesion tmux oc-manual no existe.

**Impacto:** El coordinator hace probe de oc-manual y obtiene tmux:"dead" o error.
No es critico (no crashea) pero ensucia los logs.

**Como arreglar:**
Opcion A — Crear la sesion:
```bash
tmux new-session -d -s oc-manual -c /home/gestoria/oc-manual
```

Opcion B — Quitar de clients.json:
```bash
# Editar /opt/sypnose/config/clients.json y eliminar la entrada oc-manual
sudo systemctl restart sypnose-coordinator
```

**En servidor nuevo:** Siempre verificar que CADA entrada de clients.json tiene sesion tmux:
```bash
tmux list-sessions -F '#{session_name}'
# Cada nombre debe coincidir con un tmux_session en clients.json
```

---

## PROBLEMA 3: Dashboard con namespaces vacios (Cost, Reliability, Telemetry = 0)

**Sintoma:** El dashboard muestra 174 keys pero solo en heartbeats (158) y policies (15).
Cost=0, Reliability=0, Memory=0, Telemetry=0.

**Causa:** Esto NO es un bug. Estos namespaces solo se llenan cuando hay actividad real:
- Cost: se escribe cuando un agente usa callModel() (llama a un LLM via CLIProxy)
- Reliability: se escribe cuando una tarea se verifica (verifyTask)
- Memory: se escribe cuando un agente guarda memoria (autoDream)
- Telemetry: no esta implementado como persist al KB (solo SSE streaming)

**Impacto:** El dashboard parece vacio pero el sistema funciona. Es confuso para el usuario.

**Como mejorar:**
1. Enviar una tarea de prueba via MCP para generar actividad:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"send_task","arguments":{"client_id":"gestoriard","description":"Test: ejecutar echo hello"}}}' | node /opt/sypnose/mcp/server.js
```
2. Despues de la tarea, el dashboard deberia mostrar Cost > 0

**En servidor nuevo:** Es normal que el dashboard este vacio al principio. Se llena con uso.

---

## PROBLEMA 4: 7 errores en install-sypnose-full.sh

**Version actual:** Commit 7ee4c25 en radelqui/sypnose

| # | Linea | Error | Como arreglar |
|---|---|---|---|
| 1 | 100-156 | Paso 2 KB duplicado: lineas 106-122 Y 125-155 hacen lo mismo | Eliminar bloque 124-155 (es codigo muerto, PREREQ_KB == KB_SRC) |
| 2 | 117 | sed busca placeholder que no existe en el .service real | Cambiar a: sed -e "s\|User=.*\|User=$USER\|" -e "s\|/home/gestoria\|/home/$USER\|g" |
| 3 | 446 | OpenClaw busca health_api.py (no existe en prerequisites/) | Cambiar a: [ -f "$OC_SRC/SOUL.md" ] (archivo que SI existe) |
| 4 | 638 | TMP_DIR no definido si usa v5.2/ (falla con set -u) | Agregar: TMP_DIR="" al inicio del Paso 4 (antes de linea 197) |
| 5 | 672 | Check crontab busca 'SYPNOSE' pero linea 577 busca 'kb-janitor.js' | Unificar: ambos busquen 'kb-janitor.js' |
| 6 | 326 | cp SSE_SRC/* copia .service al directorio de codigo | Cambiar a: cp "$SSE_SRC"/index.js "$SSE_SRC"/package.json "$SSE_DST/" |
| 7 | 355 | cp CH_SRC/* copia .service al directorio de codigo | Cambiar a: cp "$CH_SRC"/sypnose-channel.ts "$CH_SRC"/package.json "$CH_SRC"/tsconfig.json "$CH_DST/" |

**En servidor nuevo:** Estos errores no impiden la instalacion (son edge cases) pero
producen archivos .service en directorios equivocados y codigo muerto confuso.

---

## PROBLEMA 5: Servidor lento (RAM al limite)

**Sintoma:** SSH tarda 10-15s por comando. free -h muestra RAM 23/23Gi, Swap 7.8/8.0Gi.

**Causa:** Demasiados servicios corriendo. ClamAV ya se desactivo (libero 900MB) pero sigue lleno.

**Principales consumidores de swap (de sesion anterior):**
- IATRADER sentinel_agent.py: 385MB swap
- IATRADER ai_filter_agent: 255MB swap
- MetaTrader5: 236MB swap

**Como aliviar:**
```bash
# Apagar IATRADER agents si no estan en uso:
tmux send-keys -t iatrader-rust "/stop" Enter
# O matar procesos directamente:
pkill -f sentinel_agent.py
pkill -f ai_filter_agent
```

**En servidor nuevo:** Calcular RAM necesaria antes de instalar. Sypnose v5.2 usa ~200MB.
KB Hub ~50MB. CLIProxy ~20MB. El resto es para los agentes Claude Code (~500MB cada uno).
Minimo recomendado: 16GB RAM para 4 agentes, 32GB para 8+.

---

## DONDE ESTA TODO

| Documento | Ubicacion |
|---|---|
| Manual instalacion (22 secciones) | radelqui/sypnose/SYPNOSE-v52-MANUAL-INSTALACION.md |
| Instalador | radelqui/sypnose/install-sypnose-full.sh |
| Errores auditor (15 originales) | radelqui/sypnose/ERRORES-AUDITOR.md |
| Errores instalador (8+3) | radelqui/sypnose/ERRORES-FASE3-INSTALADOR.md |
| Mejoras post-instalacion | radelqui/sypnose/MEJORAS-POST-INSTALACION.md |
| Reglas Claude Code | radelqui/sypnose/SYPNOSE-REGLAS-CLAUDE-CODE.md |
| MCP configs | radelqui/sypnose/prerequisites/MCP-CONFIGS.md |
| Este documento | radelqui/sypnose/PROBLEMAS-PENDIENTES-030426.md |
| CLIProxy binario | GitHub Releases v5.2.0 |
