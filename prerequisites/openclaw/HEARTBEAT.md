# Heartbeat — Monitor de Arquitectos (cada 5 min, modelo: Gemini Flash)

## PUERTA HORARIA
```
hour=$(date +%H)
```
Si hour < 6 (medianoche–6AM): responde `HEARTBEAT_OK` y para. Nada más.

---

## ÚNICO CHECK: Estado de arquitectos Claude Code

Para CADA sesión activa de la lista:
```
tmux capture-pane -t gestoriard-2 -p 2>/dev/null | tail -20
tmux capture-pane -t IATRADER -p 2>/dev/null | tail -20
tmux capture-pane -t iatrader-rust -p 2>/dev/null | tail -20
tmux capture-pane -t FacturaIA -p 2>/dev/null | tail -20
tmux capture-pane -t seguridad-server -p 2>/dev/null | tail -20
```

Buscar en cada output:
- `[ARCH]` o `[BRAIN]` en última línea → **arquitecto terminó/committeó**
- `boris_register_done` → **tarea completada**
- `git push` con respuesta OK → **trabajo enviado**
- Sin output o prompt vacío > 15 min → **posible estancamiento**

## ACCION SI DETECTA TERMINACION O ESTANCAMIENTO

Solo notificar si hay algo concreto. Si todo está en curso → `HEARTBEAT_OK` sin más.

```bash
curl -s -X POST http://localhost:9099/api/sm/notifications \
  -H 'X-Api-Key: huygh-secret-2026' \
  -H 'Content-Type: application/json' \
  -d '{"type":"architect_done","result":"[sesion]: terminó","detail":"[últimas 3 líneas del tmux]"}'
```

Para estancamiento:
```bash
curl -s -X POST http://localhost:9099/api/sm/notifications \
  -H 'X-Api-Key: huygh-secret-2026' \
  -H 'Content-Type: application/json' \
  -d '{"type":"architect_stalled","result":"[sesion]: sin actividad","detail":"[output]"}'
```

## RESPUESTA

Si todo normal: `HEARTBEAT_OK`
Si notificó algo: `HEARTBEAT_NOTIFIED — [sesion] — [qué detectó]`

---

## CHECK ADICIONAL: Tareas KB pendientes para OC

Antes del check de arquitectos, ejecutar:
```
grep "NUEVO" ~/.openclaw/workspace/pending-kb-tasks.md 2>/dev/null | tail -5
```

Si hay líneas con `NUEVO`:
- Leer cada task key de la columna 4
- Hacer `curl -s "http://localhost:18791/api/search?q={task-key}" ` para obtener la tarea completa
- Informar a Carlos: "Tengo X tareas KB pendientes: [lista]"
- Cambiar `NUEVO` por `VISTO` en el archivo después de informar

Si no hay `NUEVO` → continuar con check de arquitectos normal.
