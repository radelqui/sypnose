# SYPNOSE — REGLAS PARA CLAUDE CODE

Estas reglas evitan los 15 errores encontrados durante la instalacion de Sypnose v5.2.
Cualquier Claude Code que trabaje con Sypnose DEBE leer esto antes de tocar codigo.

---

## REGLA 1: Knowledge Hub usa "value", NUNCA "data"

El campo de datos en el KB se llama "value". No "data", no "content", no "body".

- POST /api/save necesita: { key, value, category, project }
- GET /api/read?key=X devuelve: { entry: { value: "..." } }

Si escribes "data" en cualquier parte, el KB devuelve 500 o ignora el campo.

## REGLA 2: KB reads son GET, NUNCA POST

- /api/read = GET con ?key=X
- /api/list = GET con ?category=X&limit=N&offset=N
- /api/search = GET con ?q=X

Solo /api/save es POST. Todo lo demas es GET con query params.

## REGLA 3: KB list NO tiene filtro por key prefix

El endpoint /api/list filtra por category, project y tier.
NO acepta prefix de key. Si necesitas filtrar por key prefix (ej: "mailbox:"),
debes paginar todas las entries y filtrar client-side:

```javascript
const all = [];
let offset = 0;
while (true) {
  const r = await fetch(KB_API + '/list?limit=200&offset=' + offset);
  const j = await r.json();
  const keys = (j.entries || []).map(e => e.key).filter(k => k.startsWith(prefix));
  all.push(...keys);
  if (!j.entries || j.entries.length < 200) break;
  offset += 200;
  if (offset > 2000) break;
}
```

## REGLA 4: CLIProxy (SypnoseProxy) requiere auth en /v1/*

- GET / devuelve 200 sin auth (usar para health check)
- GET /v1/models devuelve 401 sin API key
- POST /v1/chat/completions devuelve 401 sin API key

Para health checks, usar / no /v1/models.

## REGLA 5: Verificar paths ANTES de escribir config

Antes de poner un path en clients.json:
```bash
ls -d /home/gestoria/[proyecto] || echo "NO EXISTE"
```

Antes de poner una sesion tmux:
```bash
tmux has-session -t [nombre] 2>/dev/null && echo "OK" || echo "NO EXISTE"
```

## REGLA 6: Descubrir agentes, no asumirlos

No hardcodear la lista de agentes. Descubrirlos:
```bash
tmux list-sessions -F '#{session_name}'
```
Cada sesion = un agente. Verificar que cada uno tiene proyecto real.

## REGLA 7: El script de verificacion va PRIMERO

Antes de escribir funciones KB en el coordinator:
1. Escribir verify-kb-integrity.sh
2. Probar que funciona manualmente
3. Solo entonces escribir kbSave/kbRead/kbList en el codigo

Si el script de verificacion falla, todo lo demas tambien fallara.

## REGLA 8: MCP schema = mismos campos que KB API

Si el KB usa "value", el MCP schema usa "value".
Si el KB devuelve "entry.value", el MCP response usa "value".
Nunca inventar nombres de campo diferentes.

## REGLA 9: Probar write/read ANTES de arrancar daemons

```bash
# Write
curl -s -X POST http://localhost:18791/api/save \
  -H "Content-Type: application/json" \
  -d '{"key":"test-install","value":"ok"}'

# Read
curl -s 'http://localhost:18791/api/read?key=test-install'
# Debe devolver: { "entry": { "value": "ok", ... } }
```

Si esto falla, NO arrancar el coordinator. Diagnosticar primero.

## REGLA 10: Despues de cada fix, reiniciar CON NUEVO PID

systemctl restart no siempre mata el proceso viejo.
Verificar siempre:
```bash
systemctl show sypnose-coordinator --property=MainPID
```
Si el PID no cambio, forzar:
```bash
sudo systemctl stop sypnose-coordinator
sleep 3
sudo systemctl start sypnose-coordinator
```

## REGLA 11: Boris para cada paso

No instalar sin Boris. Cada paso:
1. boris_start_task antes de empezar
2. boris_verify con evidencia real despues de cada cambio
3. boris_save_state cada 15-20 minutos

Sin Boris, los errores se acumulan y no hay rollback.

---

## RESUMEN RAPIDO

| Hacer | NO hacer |
|---|---|
| Campo "value" en KB | Campo "data" |
| GET para reads/lists | POST para reads/lists |
| Paginar + filtrar client-side | Asumir que KB filtra por prefix |
| Health check en / | Health check en /v1/models |
| Descubrir agentes con tmux | Hardcodear lista de agentes |
| Verificar paths con ls -d | Asumir que existen |
| Probar KB write/read primero | Arrancar daemons sin probar |
| Boris en cada paso | Instalar sin verificacion |
