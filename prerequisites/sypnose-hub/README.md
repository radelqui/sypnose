# sypnose-hub — SSE Bridge sobre Knowledge Hub

Microservicio que emite Server-Sent Events (SSE) desde el Knowledge Hub de Sypnose.
Permite al SM recibir notificaciones de arquitectos en tiempo real sin polling.

## Arquitectura

```
Arquitectos → kb_save → Knowledge Hub (:18791)
                              ↓ (polling 5s)
                        sypnose-hub (:8095)
                              ↓ (SSE push)
                        SM / Dashboard / Clientes
```

## Endpoints

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | /health | No | Status JSON: clientes, uptime, eventos |
| GET | /stream | Bearer | SSE stream de notificaciones |
| GET | /stream?last_id=N | Bearer | Reconexión: replay desde ID N |
| POST | /publish | Bearer | Publicar evento directo (sin KB) |

## Auth

Token en `~/.config/sypnose-hub.env` (auto-generado).
Consultar: `kb_read key=sypnose-hub-token project=sypnose`
Header: `Authorization: Bearer TOKEN`

## Conectarse desde Windows (SM)

1. Túnel SSH: `ssh -L 8095:localhost:8095 -p 2024 gestoria@217.216.48.91`
2. EventSource:

```javascript
const es = new EventSource('http://localhost:8095/stream', {
  headers: { 'Authorization': 'Bearer TOKEN' }
});
es.addEventListener('notification', (e) => {
  const data = JSON.parse(e.data);
  console.log(data.title, data.message);
});
```

## Formato SSE

```
event: notification
data: {"id":1,"agent":"oc-manual","priority":"normal","title":"notify-sm-xxx","message":"DONE: ...","timestamp":"...","project":"seguridad"}
```

## Systemd

```bash
sudo systemctl status sypnose-hub
sudo systemctl restart sypnose-hub
journalctl -u sypnose-hub -f
```

## Logs

- journald: `journalctl -u sypnose-hub`
- Archivo: `~/.openclaw/sypnose-hub.log` (rotación 1MB, 3 archivos)

## Troubleshooting

- Health no responde: `sudo systemctl restart sypnose-hub`
- Puerto ocupado: `ss -tlnp | grep 8095`
- KB no responde: verificar `curl http://localhost:18791/api/search?q=test`
- Token: `cat ~/.config/sypnose-hub-token`

## Tech

- Node.js puro, zero dependencias npm
- Puerto: 8095
- Polling KB: cada 5s
- Buffer circular: 100 eventos
- Nginx proxy: `/_sypnose/` en :8888 (Host *.sypnose.*)
