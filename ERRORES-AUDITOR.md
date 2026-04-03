# ERRORES ENCONTRADOS EN SYPNOSE v5.2 — GUIA DE CORRECCION

Fecha: 2026-04-03
Corregido por: SM (Opus 4.6) + Carlos De La Torre
Servidor: Contabo 217.216.48.91

Este documento detalla los 15 errores encontrados en el paquete Sypnose v5.2
tal como fue entregado por el auditor externo, como se corrigieron, y como
evitarlos en una instalacion nueva.

---

## 1. ERRORES DE INTEGRACION CON KNOWLEDGE HUB (7 errores, todos CRITICOS)

### Causa raiz
El auditor construyo las funciones KB (kbSave, kbRead, kbList, kbDelete)
sin tener acceso al Knowledge Hub real. Asumio una API diferente.

### API real del Knowledge Hub (localhost:18791)

| Operacion | Metodo | Endpoint | Campo datos |
|---|---|---|---|
| Guardar | POST | /api/save | key, **value**, category, project |
| Leer | GET | /api/read?key=X | Responde: entry.value |
| Listar | GET | /api/list?category=X&limit=N&offset=N | Responde: entries (array), total |
| Buscar | GET | /api/search?q=X | Responde: results (array) |
| Health | GET | /health | Responde: 200 |

### Lo que el auditor asumio (INCORRECTO)

| Operacion | Lo que hizo | Por que falla |
|---|---|---|
| Guardar | Campo "data" | KB espera "value" = error 500 |
| Leer | POST con body | KB espera GET con ?key= = Cannot POST |
| Leer respuesta | Lee .data | KB devuelve .entry.value = null |
| Listar | POST con body { prefix } | KB espera GET ?category= = no filtra |
| Listar respuesta | Lee .keys | KB devuelve .entries = undefined |
| Eliminar | Campo data: "null" | KB espera value: "null" |

### Correcciones aplicadas en core/loop.js

**kbSave (linea 91):**
- ANTES: body con campo "data"
- DESPUES: body con campo "value"
- El KB guarda en columna "value" de SQLite

**kbRead (linea 96-104):**
- ANTES: POST /api/read con body JSON
- DESPUES: GET /api/read?key=X
- ANTES: lee response.data
- DESPUES: lee response.entry.value

**kbList (linea 98-105):**
- ANTES: POST /api/list con body { prefix }
- DESPUES: GET /api/list con paginacion (limit=200, offset)
- Filtra por key prefix client-side porque el KB no tiene filtro nativo por prefix
- Pagina hasta 2000 entries maximo para no sobrecargar

**kbDelete (linea 108):**
- ANTES: campo data: "null"
- DESPUES: campo value: "null"

### Como evitar en servidor nuevo
1. ANTES de escribir funciones KB, probar los endpoints manualmente:
   - curl -s http://localhost:18791/health
   - curl -s -X POST http://localhost:18791/api/save -H "Content-Type: application/json" -d "{\"key\":\"test\",\"value\":\"hello\"}"
   - curl -s "http://localhost:18791/api/read?key=test"
   - curl -s "http://localhost:18791/api/list?limit=5"
2. Verificar que write/read funciona ANTES de arrancar el coordinator
3. El script verify-kb-integrity.sh hace exactamente esto — correrlo primero

---

## 2. ERRORES DE CONFIGURACION (4 errores)

### 2.1 clients.json — path incorrecto
- ANTES: /home/gestoria/gestoriard (NO EXISTE)
- DESPUES: /home/gestoria/gestion-contadoresrd (path real)
- Como evitar: Ejecutar "ls -d" en cada path ANTES de escribir clients.json

### 2.2 clients.json — solo 2 de 6 clientes
El auditor solo incluyo gestoriard e iatrader. Faltan dgii, facturaia,
seguridad, jobhunter.
- Como evitar: Ejecutar "tmux list-sessions -F #{session_name}" para descubrir TODAS las sesiones

### 2.3 clients.json — IATRADER Python obsoleto
El proyecto IATRADER Python fue sustituido por iatrader-rust.
La sesion tmux "IATRADER" ya no existe.
- Como evitar: Verificar que cada sesion tmux listada en clients.json existe realmente

### 2.4 Proxy health check (core/loop.js linea 593)
- ANTES: fetch http://localhost:8317/v1/models = 401 (requiere API key)
- DESPUES: fetch http://localhost:8317/ = 200 (sin auth)
- Como evitar: Probar el endpoint sin auth. CLIProxy requiere API key para /v1/models pero / responde 200

---

## 3. ERRORES EN MCP SERVER (3 errores)

### 3.1 Schema usa "data" en vez de "value"
- ANTES: properties: { key: string, data: object }
- DESPUES: properties: { key: string, value: string }

### 3.2 Handler usa args.data
- ANTES: kbSave(args.key, args.data)
- DESPUES: kbSave(args.key, args.value)

### 3.3 Response usa { data: }
- ANTES: return { data: kbRead(args.key) }
- DESPUES: return { value: kbRead(args.key) }

Como evitar: El MCP server debe usar los mismos nombres de campo que la API del KB.

---

## 4. ERRORES EN SCRIPT DE VERIFICACION (1 error, multiples manifestaciones)

verify-kb-integrity.sh tenia los mismos bugs que core/loop.js:
usaba POST para reads, "data" en vez de "value", /v1/models para proxy check.

Como evitar: El script de verificacion debe ser lo PRIMERO que se escribe y prueba.
Si el script falla, el coordinator tambien fallara. Escribir el script, probarlo,
y solo entonces escribir las funciones en el coordinator.

---

## 5. ERRORES EN DOCUMENTACION (2 errores)

### 5.1 DISPATCH.md dice "13/13 smoke tests"
Realmente son 12/12 smoke + 21/21 full = 33 tests total

### 5.2 DISPATCH.md dice "SypnoseProxy"
El nombre real en nuestro sistema es CLIProxy (puerto :8317, escrito en Go).
SypnoseProxy es el nombre generico que el auditor uso.

---

## CHECKLIST PARA SERVIDOR NUEVO

Antes de instalar Sypnose v5.2, verificar que estos servicios estan corriendo:

- [ ] Knowledge Hub en :18791 — curl -s http://localhost:18791/health = 200
- [ ] CLIProxy en :8317 — curl -s http://localhost:8317/ = 200

Despues de copiar archivos pero ANTES de arrancar daemons:

- [ ] Probar KB write: curl -X POST localhost:18791/api/save -d '{"key":"test","value":"ok"}'
- [ ] Probar KB read: curl -s 'localhost:18791/api/read?key=test' = entry.value "ok"
- [ ] Listar sesiones: tmux list-sessions -F '#{session_name}'
- [ ] Verificar paths: ls -d /path/proyecto para cada uno en clients.json
- [ ] Correr tests: npm test (12/12) + node scripts/test-full.js (21/21)
- [ ] Correr verify: bash scripts/verify-kb-integrity.sh (todo OK)

Despues de arrancar daemons:

- [ ] journalctl -u sypnose-coordinator -n 15 = probes de cada agente "alive"
- [ ] curl localhost:18795/health = {"status":"ok"}
- [ ] Verificar KB write/read en el integrity check = OK

Si algo falla: NO continuar. Diagnosticar primero. El coordinator con
funciones KB rotas parece que funciona (loop corre, logs salen) pero
no puede leer ni escribir en el KB = agentes invisibles.
