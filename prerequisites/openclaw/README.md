# OpenClaw — Prerequisito

OpenClaw es el gateway de agentes IA de Sypnose. Gestiona agentes autonomos con
memoria, crons, canales (Telegram, WebSocket), y herramientas de ejecucion.

Version en produccion: **2026.3.13** (61d171a)

## Instalacion

### Via npm (recomendado)
```bash
# Requiere Node.js v18+
npm install -g openclaw

# Verificar
openclaw --version
```

En el servidor, se uso nvm-windows / nvm para gestionar Node.js:
```bash
# Instalar nvm (Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# Instalar openclaw
npm install -g openclaw
```

El binario queda en: `~/.npm-global/bin/openclaw` (o el prefix de npm global)

## Configuracion inicial

### 1. Crear directorio de config
```bash
mkdir -p ~/.openclaw/workspace
```

### 2. Configurar openclaw.json
```bash
cp openclaw.json.example ~/.openclaw/openclaw.json
# Editar con tu configuracion
nano ~/.openclaw/openclaw.json
```

Campos clave a configurar:
- `models.providers.cliproxy.baseUrl`: URL de CLIProxy (ej: `http://127.0.0.1:8317/v1`)
- `models.providers.cliproxy.apiKey`: API key de CLIProxy
- `gateway.port`: puerto del gateway WebSocket (default: 18790)
- `gateway.auth.token`: token de autenticacion del gateway

### 3. Iniciar OpenClaw
```bash
openclaw start
```

Interface de control: http://127.0.0.1:18790/chat?session=main

## Archivos de workspace incluidos

Los archivos en este directorio son plantillas del workspace del servidor:

| Archivo | Descripcion |
|---|---|
| `SOUL.md` | Identidad y personalidad del agente SM |
| `HEARTBEAT.md` | Estado y checklist del heartbeat |
| `IDENTITY.md` | Rol e instrucciones del agente |
| `AGENTS.md` | Configuracion de sub-agentes |
| `TOOLS.md` | Herramientas disponibles para agentes |
| `CLAUDE-example.md` | Ejemplo de CLAUDE.md para workspace |

Copiar al workspace:
```bash
cp *.md ~/.openclaw/workspace/
```

## Canales disponibles

- **WebSocket/HTTP**: http://127.0.0.1:18790 (local)
- **Telegram**: configurar en `channels.telegram` del openclaw.json
- **FakeChat UI**: plugin adicional en puerto 8787

## openclaw.json — estructura minima

```json
{
  "models": {
    "providers": {
      "cliproxy": {
        "baseUrl": "http://127.0.0.1:8317/v1",
        "apiKey": "sk-TU-KEY-CLIPROXY",
        "api": "openai-completions",
        "models": [
          { "id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash" }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "cliproxy/gemini-2.5-flash" },
      "workspace": "/home/tuusuario/.openclaw/workspace"
    },
    "list": [
      {
        "id": "main",
        "default": true,
        "identity": { "name": "SM", "theme": "Service Manager" }
      }
    ]
  },
  "gateway": {
    "port": 18790,
    "mode": "local",
    "bind": "loopback",
    "auth": { "mode": "token", "token": "GENERA-UN-TOKEN-SEGURO" }
  }
}
```

## Integracion con Sypnose

OpenClaw actua como SM (Service Manager) del sistema:
- Recibe planes de Claude Code via Knowledge Hub
- Los distribuye a arquitectos (gestoriard, iatrader, seguridad, etc.)
- Monitorea respuestas y reenvía notificaciones
- Ejecuta crons de mantenimiento (boris-audit, model-police, etc.)
