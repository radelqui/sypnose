# Sypnose — Comunicación Live

**Verificado**: 01-Abr-2026 | **Latencia E2E**: 741ms | **Estado**: OPERATIVO

## Qué es

Comunicación en tiempo real entre Service Manager y arquitectos. Cuando un arquitecto guarda resultado en KB, el SM lo ve en menos de 1 segundo. Sin polling manual.

## Arquitectura

```
Arquitecto termina trabajo
    → kb_save category=notification
    → Knowledge Hub (:18791) guarda
    → Sypnose Hub (:8095) detecta en 5s (polling)
    → SSE stream emite evento
    → SM recibe via hook kb-inbox-check
    → 741ms total ida y vuelta
```

## Componentes

### Servidor (Contabo)

| Servicio | Puerto | Función |
|----------|--------|---------|
| Knowledge Hub | 18791 | BD SQLite — kb_save, kb_read, kb_search, a2a_send |
| Knowledge Hub SSE | 18793 | SSE bridge para MCP supergateway |
| Sypnose Hub | 8095 | SSE live push — polling KB 5s, buffer 100 eventos, auth Bearer |
| kb-task-watcher | systemd | Cada 60s detecta tasks pending, rutea a arquitectos |
| OpenClaw Gateway | 18790 | Supervisor 24/7 — 7 crons, 35 modelos, Mission Control :3333 |

### Cliente (Windows SM)

| Componente | Función |
|------------|---------|
| sypnose-tunnels MCP | Abre 6 tuneles SSH automaticamente |
| sypnose-channel MCP | Recibe SSE live del hub |
| knowledge-hub MCP | Acceso KB via supergateway |
| kb-inbox-check hook | Detecta notificaciones nuevas cada mensaje |
| sm-identity-loop hook | Identidad SM en cada mensaje |

### Tuneles SSH (automaticos via sypnose-tunnels)

| Local | Remoto | Servicio |
|-------|--------|----------|
| 18791 | 18791 | Knowledge Hub API |
| 18793 | 18793 | KB SSE bridge |
| 8095 | 8095 | Sypnose Hub live |
| 8317 | 8317 | CLIProxyAPI (46 modelos) |
| 3002 | 3002 | Sypnose Agent UI |
| 3000 | 3000 | CodeMan |

## 4 Canales de Comunicación

### 1. KB Notifications (PRINCIPAL — funciona automatico)
```bash
# Arquitecto al terminar:
kb_save key=resultado-[tarea]-[fecha] category=notification project=[proyecto] value="DONE: ..."

# SM lo ve automaticamente via hook kb-inbox-check
```

### 2. A2A — Mensajes Directos
```bash
# Arquitecto → SM:
a2a_send from=[tu-id] to=sm-claude-web type=notify payload="mensaje"

# SM lee:
a2a_messages agent=sm-claude-web unread=true
```

### 3. Channels — Broadcast
```bash
# Broadcast a todos:
channel_publish channel=system-alerts from=[tu-id] message="alerta"

# Leer canal:
channel_read channel=system-alerts limit=10
```

### 4. sm-tmux — SM envia planes (incluye Gemini Gate)
```bash
# SM crea plan en KB, luego:
sm-tmux send [sesion] "kb_read key=[plan] project=[proyecto] && echo EJECUTA"
# Gemini Gate valida las 6 etiquetas automaticamente
```

## Protocolo de Cierre (OBLIGATORIO — en CLAUDE.md global)

Todo arquitecto al terminar CUALQUIER trabajo:

1. **Verificar** con evidencia real (output copiado)
2. **kb_save** category=notification con: DONE, COMMITS, VERIFICADO, DESCUBRIMIENTOS, SUGERENCIAS
3. **Preguntar mejoras** — que mas se puede mejorar?
4. **PARAR** — no actuar fuera del plan

Sin kb_save = trabajo invisible para el SM.

## OpenClaw Supervisor (24/7)

Gateway en :18790 con 7 crons activos:
- security-nightly (3am, deepseek-v3.2)
- security-quick (cada 6h, deepseek-v3.2)
- security-weekly (domingos 4am, gemini-2.5-pro)
- architect-monitor (cada 3min, gemini-2.5-flash)
- kb-response-monitor (cada 2min)
- kb-task-self-check (cada 2min)
- health-check-30min (cada 30min, qwen3-coder-plus)

Mission Control dashboard en localhost:3333 (solo seguridad).

## Instalación desde cero

```bash
# 1. Servidor — Knowledge Hub
cd /home/shared && mkdir knowledge-hub
# (ver docs/sypnose-hub-install.md para detalles)

# 2. Servidor — Sypnose Hub
cd /home/shared && mkdir sypnose-hub
node index.js  # Node.js puro, zero deps, polling KB 5s
systemctl enable sypnose-hub

# 3. Cliente — Tuneles SSH
ssh -L 18791:localhost:18791 -L 8095:localhost:8095 -L 18793:localhost:18793 -p 2024 gestoria@SERVIDOR -N &

# 4. Cliente — MCP en claude_desktop_config.json
{
  "knowledge-hub": {
    "command": "npx",
    "args": ["-y", "supergateway", "--sse", "http://localhost:18793/sse"]
  }
}

# 5. Verificar
curl http://localhost:18791/api/list?limit=1  # KB responde
curl -N http://localhost:8095/stream           # SSE abierto
```

## Métricas Verificadas (01-Abr-2026)

- Latencia E2E: **741ms**
- KB entries: **4,000+**
- Arquitectos con protocolo cierre: **7/7** (CLAUDE.md global)
- OpenClaw crons activos: **7**
- Modelos disponibles: **35** (via CLIProxyAPI)
- Canales comunicacion: **4** (KB, A2A, Channels, sm-tmux)
