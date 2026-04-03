# sypnose-channel

MCP Server que conecta Claude Code con sypnose-hub via SSE para push notifications live.

## Instalacion

```bash
cd /home/shared/sypnose-hub/channel
npm install
```

## Uso como MCP en Claude Code

Agregar a `~/.claude.json` mcpServers:

```json
"sypnose-channel": {
  "command": "bun",
  "args": ["run", "/home/shared/sypnose-hub/channel/sypnose-channel.ts"],
  "env": {
    "SYPNOSE_HUB_URL": "http://localhost:8095",
    "SYPNOSE_HUB_TOKEN": "sypnose-hub-secret-2026"
  }
}
```

## Tools

- `reply_to_agent` — Enviar mensaje a un agente via hub
- `agent_status` — Estado del hub y channel

## Como funciona

1. Se conecta al SSE stream de sypnose-hub (:8095/stream)
2. Recibe notificaciones de KB entries con notify-sm o TO: sm
3. Las pushea a Claude Code via stderr
4. reply_to_agent hace POST /publish al hub
