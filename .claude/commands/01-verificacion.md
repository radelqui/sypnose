---
description: Reglas de verificacion obligatoria para todo cambio
globs: ["**/*"]
---

# LEY DE VERIFICACION -- OBLIGATORIO SIEMPRE

## NO puedes hacer commit sin verificar. El hook lo bloquea.

Para hacer commit necesitas:
1. Verificar el cambio (ver abajo como)
2. Llamar `boris_verify` del MCP con evidencia concreta
3. El MCP escribe .brain/last-verification.md con Estado: APROBADO
4. El hook prompt verifica que el MCP aprobo
5. Entonces git commit pasa

## Como verificar segun tipo de cambio:

- **UI (.tsx, .jsx, .html, .css, .vue)**: Chrome MCP -> navega -> clickea -> confirma
- **API endpoint**: curl -X METHOD url -d 'datos' -> response con status code
- **Base de datos**: Query SELECT que confirme el cambio
- **Python (.py)**: pytest -> output con PASSED
- **JavaScript (.ts, .js)**: npm test o npm run build -> output
- **Rust (.rs)**: cargo test -> output
- **Config/deploy**: curl health endpoint -> servicio responde
- **Fix de bug**: Reproduce escenario original -> confirma que ya no falla
- **Docker**: docker ps + curl health -> container running
- **Shell (.sh)**: bash -n [archivo] -> syntax OK

## Formato de evidencia (boris_verify del MCP):

```
what_changed: "que cambiaste"
how_verified: "como lo verificaste (min 20 chars, concreto)"
result: "resultado real (min 15 chars, con output)"
```

## PROHIBIDO:
- "Deberia funcionar" -> NO ES EVIDENCIA (MCP la rechaza)
- "Ya lo cambie" sin resultado -> NO ES EVIDENCIA
- "Los tests pasan" sin output -> NO ES EVIDENCIA
- Expresar satisfaccion ("Listo!", "Perfecto!") ANTES de verificar
- Commit sin pasar por boris_verify primero
