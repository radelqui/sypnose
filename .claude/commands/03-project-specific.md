---
description: Reglas especificas del proyecto (ADAPTAR por proyecto)
globs: ["**/*"]
---

# REGLAS DEL PROYECTO -- [NOMBRE]

## Arquitectura
[Breve descripcion de la arquitectura del proyecto]

## Stack
[Tecnologias principales]

## Comandos de desarrollo
```
Build: [comando]
Test: [comando]
Lint: [comando]
Deploy: [comando]
```

## Errores conocidos
[Lista de errores o quirks que el agente debe conocer]

## Reglas especificas
[Reglas que aplican SOLO a este proyecto]

## Verificacion (verify-app)
[Como verificar cambios en este proyecto especifico]

---
## EJEMPLOS POR PROYECTO (borrar los que no apliquen):

### GestoriaRD
```
UI: Chrome MCP -> navegar -> modals, forms, tablas, datos de BD
API: curl endpoints Next.js -> 200 OK
BD: PostgreSQL queries -> confirmar datos
Docker: 71 tablas PostgreSQL, Coolify deploy
Stack: Next.js 14, PostgreSQL, Docker, Coolify
Build: npm run build
Test: npm test
```

### IATRADER
```
Pipeline: BrainAgent -> ValidatorAgent -> ExecutorAgent
RPyC: conexion a MT5 via Wine
CRITICAL: NUNCA auto-deploy cambios de trading sin aprobacion Carlos
Verificar en modo paper/backtest primero
Stack: Python, MetaTrader5, RPyC, XGBoost
Test: pytest
```

### FacturaIA
```
OCR: Procesar factura ejemplo -> campos extraidos correctos
Multi-tenant: Login como tenant -> datos aislados, no data leak
Supabase: Schema isolation por tenant
Stack: React Native, Expo, Supabase, Python OCR
Build: cd android && ./gradlew assembleRelease
```

### seguridad-server
```
CRITICAL: NUNCA cambiar firewall sin verificar SSH primero
Verificar: servicios responden, puertos correctos, SSH accesible
Stack: Ubuntu 24.04, Docker, UFW, Fail2ban
```
