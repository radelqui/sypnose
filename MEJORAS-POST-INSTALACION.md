# MEJORAS POST-INSTALACION — Aplicar despues de instalar Sypnose v5.2

Fecha: 2026-04-03
Estas mejoras se descubrieron DESPUES de la instalacion inicial.
Ya estan aplicadas en los archivos de este repo (v5.2/core/loop.js, v5.2/mcp/server.js).
Este documento explica QUE se cambio y POR QUE, para que el instalador lo tenga en cuenta.

---

## MEJORA 1: MCP server — default-allow con blacklist

**Archivo:** v5.2/mcp/server.js (linea 12)

**Problema:** El MCP tenia una whitelist restrictiva que solo permitia writes a keys
que empezaran con `task:`, `mailbox:` o `mem:topic:`. Cualquier otro prefix
(como `notify-sm-`, `resultado-`, `sesion-`) era bloqueado silenciosamente.

**Impacto:** Los agentes creian que guardaban datos, pero el MCP devolvia
`{ error: "namespace blocked" }` sin que nadie se enterara.

**Fix aplicado:** Cambiar de whitelist (default-deny) a blacklist (default-allow).
Solo se bloquean los namespaces internos sensibles: `mem:dream-lock:`, `reliability:`,
`cost:`, `compact:`. Todo lo demas se permite.

```javascript
// ANTES (bloqueaba casi todo):
return ALLOWED.some(p => key.startsWith(p)) ? { allowed: true } : { allowed: false };

// DESPUES (permite todo excepto sensibles):
return { allowed: true };
```

**Para el instalador:** El archivo v5.2/mcp/server.js en este repo YA tiene el fix.
No hacer nada adicional.

---

## MEJORA 2: Coordinator heartbeat al KB

**Archivo:** v5.2/core/loop.js (despues del yield Y5)

**Problema:** El coordinator corria cada 30s pero no escribia nada en el KB.
Los namespaces Heartbeats, Policies, Telemetry mostraban 0 keys.
No habia forma de saber desde el KB si el coordinator estaba vivo.

**Fix aplicado:** Despues del yield Y5 (budgets), el coordinator ahora:
1. Escribe `heartbeat:coordinator` cada tick (cada 30s)
2. Escribe `policies:flags` cada 10 ticks (~5 minutos)

```javascript
// Heartbeat cada tick
await kbSave("heartbeat:coordinator", {
  ts: new Date().toISOString(),
  tick: this.tick,
  uptime: Math.round(process.uptime()),
  clients: this.clients.length,
  version: VERSION
});

// Policies cada 10 ticks
if (this.tick % 10 === 0) await kbSave("policies:flags", gFlags);
```

**Verificacion:** Despues de arrancar el coordinator, esperar 1 minuto y:
```bash
curl -s 'http://localhost:18791/api/read?key=heartbeat:coordinator'
# Debe devolver entry con ts, tick, uptime, clients, version
```

**Para el instalador:** El archivo v5.2/core/loop.js en este repo YA tiene el fix.

---

## MEJORA 3: 7 agentes en clients.json (no 6)

**Archivo:** v5.2/config/clients.json

**Problema:** El config original tenia 6 agentes. Faltaba `oc-manual`
(sesion tmux para documentacion y sm-tmux).

**Fix aplicado:** Añadida entrada para oc-manual.

**Para el instalador:** clients.json es un EJEMPLO. Cada servidor tiene sus propios
agentes. El instalador debe:
1. Ejecutar `tmux list-sessions -F '#{session_name}'` para descubrir agentes reales
2. Verificar paths con `ls -d /home/usuario/proyecto`
3. Editar clients.json con los agentes reales de ese servidor

---

## MEJORA 4: kbList con paginacion client-side

**Archivo:** v5.2/core/loop.js (funcion kbList)

**Problema:** El Knowledge Hub no tiene filtro nativo por key prefix.
El auditor asumio que `/api/list?prefix=mailbox:` filtraba — no lo hace.
Devuelve todas las entries sin filtrar.

**Fix aplicado:** kbList ahora pagina (limit=200, offset) y filtra por
`key.startsWith(prefix)` en el cliente. Maximo 2000 entries para no sobrecargar.

**Para el instalador:** Ya aplicado en v5.2/core/loop.js. Tener en cuenta
que si el KB tiene >2000 entries, algunas keys pueden no encontrarse.

---

## MEJORA 5: verify-kb-integrity.sh corregido

**Archivo:** v5.2/scripts/verify-kb-integrity.sh

**Problema:** El script original tenia los mismos bugs que core/loop.js
(POST para reads, "data" en vez de "value", /v1/models para proxy check).

**Fix aplicado:** Reescrito completo. Ahora usa:
- GET para reads (no POST)
- "value" en saves (no "data")
- / para proxy health (no /v1/models)
- Namespaces reales (mailbox, task, notification, report, config)

**Para el instalador:** Ya aplicado. Correr SIEMPRE despues de instalar:
```bash
bash scripts/verify-kb-integrity.sh
# Todo debe dar OK antes de arrancar daemons
```

---

## CHECKLIST PARA INSTALADOR

Despues de copiar los archivos de v5.2/:

- [ ] Verificar que v5.2/mcp/server.js tiene `return { allowed: true }` en linea 12
- [ ] Verificar que v5.2/core/loop.js tiene `kbSave("heartbeat:coordinator"` 
- [ ] Editar v5.2/config/clients.json con agentes reales del servidor
- [ ] Correr `bash scripts/verify-kb-integrity.sh` — todo OK
- [ ] Despues de arrancar: `curl 'localhost:18791/api/read?key=heartbeat:coordinator'` — tiene datos
- [ ] Dashboard: `node scripts/kb-dashboard.js` — Heartbeats > 0
