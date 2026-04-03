# MCP CONFIGS — Configuraciones para conectar todo

Sin estos MCPs, un Claude Code no puede comunicarse con el sistema Sypnose.
Copiar las configs segun el entorno (servidor o desktop).

---

## SERVIDOR — ~/.claude/settings.json (seccion mcpServers)

MCPs minimos que cada arquitecto en el servidor necesita:

```json
{
  "mcpServers": {
    "knowledge-hub": {
      "command": "node",
      "args": ["/opt/knowledge-hub/src/mcp-server.js"],
      "env": { "NODE_ENV": "production" }
    }
  }
}
```

Instalar Boris MCP (una vez por servidor):
```bash
pip install mcp pydantic --break-system-packages
cp prerequisites/boris/boris_mcp.py ~/.boris/boris_mcp.py
claude mcp add boris --scope user -- python3 ~/.boris/boris_mcp.py
```

### MCPs opcionales del servidor (segun proyecto)

```json
{
  "mcpServers": {
    "knowledge-hub": {
      "command": "node",
      "args": ["/opt/knowledge-hub/src/mcp-server.js"],
      "env": { "NODE_ENV": "production" }
    },
    "playwright": {
      "command": "/usr/bin/node",
      "args": ["/usr/lib/node_modules/@playwright/mcp/cli.js"]
    },
    "context7": {
      "command": "/usr/bin/node",
      "args": ["/usr/lib/node_modules/@upstash/context7-mcp/dist/index.js"]
    },
    "perplexity": {
      "command": "/usr/bin/node",
      "args": ["/usr/lib/node_modules/@perplexity-ai/mcp-server/dist/index.js"],
      "env": {
        "PERPLEXITY_API_KEY": "CAMBIAR",
        "PERPLEXITY_BASE_URL": "http://localhost:8318/v1"
      }
    }
  }
}
```

---

## WINDOWS/MAC (Desktop o Claude Code) — claude_desktop_config.json

Para el SM o cualquier Claude Code que se conecte desde fuera del servidor.
Requiere tuneles SSH activos (via sypnose-tunnels MCP o manual).

### Ubicacion del archivo
- Windows: %APPDATA%\Claude\claude_desktop_config.json
- Mac: ~/Library/Application Support/Claude/claude_desktop_config.json

### Config minima (4 MCPs esenciales)

```json
{
  "mcpServers": {
    "sypnose-tunnels": {
      "command": "node",
      "args": ["RUTA/sypnose-tunnels/index.js"],
      "env": {
        "SSH_HOST": "IP_SERVIDOR",
        "SSH_PORT": "2024",
        "SSH_USER": "USUARIO",
        "SSH_KEY_PATH": "RUTA/.ssh/id_rsa"
      }
    },
    "knowledge-hub": {
      "command": "npx",
      "args": ["-y", "supergateway", "--sse", "http://localhost:18793/sse"]
    },
    "sypnose-channel": {
      "command": "node",
      "args": ["RUTA/sypnose-channel/index.js"],
      "env": {
        "SYPNOSE_HUB_URL": "http://localhost:8095/stream",
        "SYPNOSE_HUB_BASE": "http://localhost:8095",
        "SYPNOSE_HUB_TOKEN": "GENERAR_CON_openssl_rand_hex_32"
      }
    },
    "ssh-mcp": {
      "command": "npx",
      "args": ["-y", "ssh-mcp", "--", "--host=IP_SERVIDOR", "--port=2024", "--user=USUARIO", "--key=RUTA/.ssh/id_rsa"]
    }
  }
}
```

### Que hace cada MCP

| MCP | Puerto tunel | Funcion |
|---|---|---|
| sypnose-tunnels | Abre todos | Abre tuneles SSH automaticos al arrancar |
| knowledge-hub | :18793 (SSE) | Conecta al KB via supergateway (kb_save, kb_read, kb_search) |
| sypnose-channel | :8095 | Recibe notificaciones live de arquitectos via SSE |
| ssh-mcp | :2024 | Ejecuta comandos SSH en el servidor |

### Tuneles que sypnose-tunnels abre automaticamente

| Puerto local | Puerto servidor | Servicio |
|---|---|---|
| 3002 | 3002 | Sypnose Agent (dashboard) |
| 7681 | 7681 | ttyd (terminal web) |
| 18793 | 18793 | KB Hub SSE |
| 8317 | 8317 | CLIProxy |
| 18791 | 18791 | KB Hub HTTP |
| 8095 | 8095 | SSE Hub |

### Prerequisitos Windows/Mac
1. Node.js >= 18 instalado
2. Clave SSH configurada (id_rsa con acceso al servidor)
3. `npm install -g supergateway` (para el MCP de knowledge-hub)

### Orden de arranque
1. Abrir Claude Desktop/Code
2. sypnose-tunnels se conecta automaticamente (abre tuneles)
3. knowledge-hub conecta al KB via tunel
4. sypnose-channel conecta al SSE Hub via tunel
5. Listo — el SM puede leer KB, recibir notificaciones, y enviar trabajo

---

## BORIS MCP — Instalacion

Boris MCP es un servidor Python (644 lineas) que proporciona estas tools:

| Tool | Funcion |
|---|---|
| boris_start_task | Iniciar tarea (git pull, tag, estado) |
| boris_get_state | Leer estado actual (.brain/) |
| boris_save_state | Guardar progreso |
| boris_verify | Registrar evidencia (OBLIGATORIO antes de commit) |
| boris_register_done | Marcar tarea como completada |
| boris_sync | Sincronizar con git |
| boris_end_session | Cierre limpio |

### Instalacion servidor
```bash
pip install mcp pydantic --break-system-packages
mkdir -p ~/.boris
cp boris_mcp.py ~/.boris/
claude mcp add boris --scope user -- python3 ~/.boris/boris_mcp.py
```

### Instalacion Windows/Mac
```bash
pip install mcp pydantic
mkdir -p ~/.boris
cp boris_mcp.py ~/.boris/
claude mcp add boris --scope user -- python3 ~/.boris/boris_mcp.py
```

### Verificacion
```bash
claude mcp list | grep boris
# Debe mostrar: boris (python3 ~/.boris/boris_mcp.py)
```
