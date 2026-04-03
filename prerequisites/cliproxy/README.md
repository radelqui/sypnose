# CLIProxy (SypnoseProxy) — Prerequisito

CLIProxy es el router de modelos IA de Sypnose. Expone un endpoint OpenAI-compatible
que enruta peticiones a multiples providers (Groq, Cerebras, OpenRouter, Perplexity,
Gemini OAuth, Claude, etc.) con load balancing, retry automatico y alias de modelos.

## El binario

CLIProxy es un binario Go compilado. No es open source.

**Opciones para obtenerlo:**

1. **Desde GitHub Releases** (cuando este disponible):
   ```
   https://github.com/radelqui/sypnose/releases
   ```

2. **Copiar desde servidor existente:**
   ```bash
   scp -P 2024 gestoria@217.216.48.91:/home/gestoria/cliproxyapi/cli-proxy-api ./cli-proxy-api
   chmod +x cli-proxy-api
   ```
   Nota: el binario pesa ~109MB. Solo para Linux x86_64.

## Instalacion en servidor Linux

### 1. Preparar directorio
```bash
mkdir -p /home/gestoria/cliproxyapi
cd /home/gestoria/cliproxyapi
```

### 2. Copiar binario
```bash
# Desde otro servidor o desde releases
cp cli-proxy-api /home/gestoria/cliproxyapi/
chmod +x /home/gestoria/cliproxyapi/cli-proxy-api
```

### 3. Configurar
```bash
cp config.yaml.example config.yaml
# Editar config.yaml con tus API keys reales
nano config.yaml
```

Configuracion minima necesaria:
- `api-keys`: keys que usaran los clientes (OpenClaw, Claude Code, etc.)
- `openai-compatibility`: providers con sus API keys reales
- `port`: 8317 por defecto

### 4. Instalar como systemd user service
```bash
mkdir -p ~/.config/systemd/user/
cp cliproxyapi.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable cliproxyapi
systemctl --user start cliproxyapi
systemctl --user status cliproxyapi
```

### 5. Verificar
```bash
curl http://127.0.0.1:8317/v1/models -H "Authorization: Bearer sk-TU-KEY"
```

## Uso desde Claude Code

Tunnel SSH para acceso local en Windows:
```bash
ssh -L 8317:localhost:8317 -p 2024 gestoria@217.216.48.91 -N &
```

Luego desde Windows:
```bash
# Gemini
curl http://localhost:8317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-TU-KEY" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"hola"}]}'

# Perplexity
curl http://localhost:8317/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-TU-KEY" \
  -d '{"model":"sonar-pro","messages":[{"role":"user","content":"tu pregunta"}]}'
```

## Providers soportados en el servidor activo

| Provider | Modelos destacados |
|---|---|
| Groq | llama-3.3-70b, kimi-k2, qwen3-32b |
| Cerebras | cerebras-qwen3-235b, cerebras-llama-8b |
| OpenRouter | deepseek-v3.2, deepseek-r1, openrouter-llama-70b |
| Perplexity | sonar, sonar-pro, sonar-reasoning |
| Gemini OAuth | gemini-2.5-pro, gemini-2.5-flash, gemini-3-pro-preview |
| Claude OAuth | claude-sonnet-4-6, claude-haiku-4-5, claude-opus-4-6 |
