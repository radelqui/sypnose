# PARA EL AUDITOR — Correcciones aplicadas a Sypnose v5.2

Fecha: 2026-04-03
De: SM (Opus 4.6) + Carlos De La Torre

Este documento resume TODAS las correcciones que aplicamos al paquete Sypnose v5.2
que nos entregaste. El paquete corregido esta en: sypnose-v52-corrected.tar.gz (50KB).

Usa este documento para actualizar tu copia original y evitar que estos errores
se repitan en futuras versiones.

---

## RESUMEN RAPIDO

| Fase | Errores encontrados | Corregidos |
|---|---|---|
| Fase 1: Instalacion | 15 | 15 |
| Fase 3: Script instalador | 8 + 3 mejoras | 11 |
| **Total** | **26** | **26** |

---

## FASE 1: ERRORES EN EL PAQUETE ORIGINAL (15)

### Causa raiz
Tu paquete asume una API de Knowledge Hub que NO es la nuestra.
Nuestro KB usa campo "value" y metodo GET para lecturas. Tu codigo usaba "data" y POST.

### ARCHIVO: core/loop.js

| # | Linea | Funcion | Tu codigo | Correccion | Por que |
|---|---|---|---|---|---|
| 1 | 91 | kbSave | `{ key, data: JSON.stringify(data) }` | `{ key, value: JSON.stringify(data) }` | KB columna se llama "value" |
| 2 | 96 | kbRead | `method: 'POST'` | GET con `?key=` query param | KB /api/read es GET |
| 3 | 103 | kbRead | `(await r.json()).data` | `(await r.json()).entry?.value` | KB responde con entry.value |
| 4 | 98 | kbList | `method: 'POST', body: { prefix }` | GET paginado + filtro client-side | KB no tiene filtro por key prefix |
| 5 | 104 | kbList | `(await r.json()).keys` | `(await r.json()).entries.map(e => e.key)` | KB devuelve entries array |
| 6 | 108 | kbDelete | `data: 'null'` | `value: 'null'` | Mismo que error 1 |
| 7 | 593 | healthCheck | `fetch('localhost:8317/v1/models')` | `fetch('localhost:8317/')` | /v1/models requiere auth, / no |

### ARCHIVO: config/clients.json

| # | Error | Correccion |
|---|---|---|
| 8 | Path `/home/gestoria/gestoriard` | Cambiar a `/home/gestoria/gestion-contadoresrd` |
| 9 | Solo 2 clientes | Anadir los 6 reales (gestoriard, dgii, iatrader-rust, facturaia, seguridad, jobhunter) |
| 10 | IATRADER Python (obsoleto) | Reemplazar por iatrader-rust |

### ARCHIVO: mcp/server.js

| # | Error | Correccion |
|---|---|---|
| 11 | Schema: `data: { type: 'object' }` | `value: { type: 'string' }` |
| 12 | Handler: `args.data` | `args.value` |
| 13 | Response: `{ data: kbRead() }` | `{ value: kbRead() }` |

### ARCHIVO: scripts/verify-kb-integrity.sh

| # | Error | Correccion |
|---|---|---|
| 14 | Mismos bugs que loop.js (POST, data, /v1/models) | Reescrito con GET, value, / |

### ARCHIVO: DISPATCH.md

| # | Error | Correccion |
|---|---|---|
| 15 | "13/13 smoke tests" y "SypnoseProxy" | 12/12 smoke + 21/21 full. Nombre real: CLIProxy |

---

## FASE 3: ERRORES EN install-sypnose-full.sh (8 + 3 mejoras)

### ERRORES CORREGIDOS

| # | Linea | Error | Correccion |
|---|---|---|---|
| 1 | 7 | `set -e` puede matar en verificaciones opcionales | `set -euo pipefail` + `|| true` explicito |
| 2 | 184+ | `su -c "npm install"` sin PATH completo | `su -c "/usr/bin/npm install"` — ruta absoluta |
| 3 | 86 | Bun install sin HOME definido | `su -c "HOME=$HOME_DIR curl ... | bash"` |
| 4 | 161 | No verifica estructura del tar | Agregado: `[ -f "$SRC_DIR/core/loop.js" ] || fail` |
| 5 | 198 | `cat >>` concatena .env en multiples ejecuciones | `cat >` reemplaza limpiamente |
| 6 | 224 | clients.json vacio sin instrucciones | Ejemplo con placeholder + instrucciones visibles |
| 7 | 406 | sed solo reemplaza User, no paths | Agregado: `s|/home/gestoria|/home/$USER|g` |
| 8 | 433 | Crontab busca marca "SYPNOSE v5.2" que puede duplicarse | Busca "kb-janitor.js" (el comando real) |

### MEJORAS ANADIDAS

| # | Mejora | Que hace |
|---|---|---|
| M1 | Verificar espacio en disco | Falla si menos de 1GB libre en /opt |
| M2 | Logrotate automatico | Configura rotacion diaria para stream.jsonl |
| M3 | Reporte de instalacion | Genera INSTALL-REPORT.txt con estado de cada componente |

---

## REGLAS PARA EVITAR ESTOS ERRORES EN FUTURAS VERSIONES

### Regla 1: SIEMPRE probar contra la API real
Antes de escribir funciones que llaman al KB:
```bash
# Probar write
curl -s -X POST http://localhost:18791/api/save \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":"ok"}'

# Probar read
curl -s 'http://localhost:18791/api/read?key=test'

# Ver que devuelve
# { "entry": { "key": "test", "value": "ok", ... } }
```
Si ves "value" en la respuesta, usa "value" en tu codigo. Si ves GET, usa GET.

### Regla 2: KB API cheatsheet

| Operacion | Metodo | Endpoint | Campo datos | Respuesta |
|---|---|---|---|---|
| Guardar | POST | /api/save | `{ key, value }` | `{ success: true }` |
| Leer | GET | /api/read?key=X | - | `{ entry: { value: "..." } }` |
| Listar | GET | /api/list?limit=N | - | `{ entries: [...], total: N }` |
| Buscar | GET | /api/search?q=X | - | `{ results: [...] }` |
| Health | GET | /health | - | `{ status: "ok" }` |

### Regla 3: CLIProxy health
- GET / = 200 sin auth (usar para health checks)
- GET /v1/models = 401 sin API key (NO usar para health)

### Regla 4: kbList NO filtra por key prefix
El KB no tiene filtro nativo por key prefix. Si necesitas keys que empiecen con "mailbox:",
debes paginar todas las entries y filtrar client-side. Ver core/loop.js funcion kbList.

### Regla 5: Descubrir, no asumir
```bash
# Sesiones tmux reales:
tmux list-sessions -F '#{session_name}'

# Paths reales:
ls -d /home/gestoria/mi-proyecto
```
NUNCA hardcodear paths o nombres de sesiones sin verificar.

### Regla 6: Script instalador
- Rutas absolutas para npm/node: `/usr/bin/npm`, `/usr/bin/node`
- `set -euo pipefail` + `|| true` en verificaciones opcionales
- Verificar estructura del paquete ANTES de copiar
- `.env` con `>` no `>>` para evitar duplicados
- sed debe reemplazar TANTO User como paths (/home/gestoria -> /home/$USER)

---

## ARCHIVOS DEL PAQUETE CORREGIDO

```
sypnose-v52-corrected.tar.gz (50KB)
  sypnose-v52/
    core/loop.js              <- 15 fixes KB API
    mcp/server.js             <- 3 fixes schema/handler/response
    scripts/verify-kb-integrity.sh <- reescrito completo
    scripts/install.sh        <- instalador basico original
    install-sypnose-full.sh   <- instalador completo corregido (616L)
    config/clients.json       <- 6 agentes reales
    flags.json                <- PROACTIVE=false
    SYPNOSE-v52-MANUAL-INSTALACION.md  <- manual 1068L, 16 secciones
    SYPNOSE-REGLAS-CLAUDE-CODE.md      <- 11 reglas para Claude Code
    DISPATCH.md               <- actualizado
    CLAUDE.md                 <- identidad coordinator
    + lib/, bin/, server/, systemd/, .env.example, package.json
```

---

## COMO USAR EL PAQUETE CORREGIDO

```bash
# En un servidor Ubuntu limpio con KB + CLIProxy ya instalados:
tar xzf sypnose-v52-corrected.tar.gz
cd sypnose-v52
sudo bash install-sypnose-full.sh [usuario]
# Sigue las instrucciones del script
```

El manual completo esta dentro del paquete: SYPNOSE-v52-MANUAL-INSTALACION.md
