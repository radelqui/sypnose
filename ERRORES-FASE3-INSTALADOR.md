# ERRORES Y MEJORAS ENCONTRADAS EN FASE 3 — install-sypnose-full.sh

Fecha: 2026-04-03
Revisado por: SM (Opus 4.6)

Este documento lista los problemas encontrados en el script instalador
y las mejoras que cualquier Claude Code debe conocer al usarlo.

---

## ERRORES ENCONTRADOS

### Error 1: set -e puede causar salida prematura en verificaciones opcionales
- Linea: 7 (`set -e`)
- Problema: Cualquier comando que falle (como curl a un servicio no instalado) mata el script completo
- Donde afecta: Pasos 2, 3, 5, 6, 8 donde se verifican componentes opcionales
- Mitigacion actual: El script usa `&>/dev/null` y `|| true` en esas lineas
- Riesgo residual: Si alguien modifica una verificacion sin el `|| true`, el script muere
- Recomendacion: Cambiar a `set -euo pipefail` y usar `|| true` explicitamente en CADA verificacion opcional

### Error 2: su -c para npm install puede fallar con PATH incompleto
- Linea: 184 (`su -c "cd /opt/sypnose && npm install --silent" "$USER"`)
- Problema: `su -c` no siempre hereda el PATH completo. Si Node.js se instalo via nodesource, `npm` puede no estar en el PATH del usuario
- Solucion: Usar la ruta completa: `su -c "cd /opt/sypnose && /usr/bin/npm install --silent" "$USER"`
- Aplica tambien a: lineas 456, 466, 477 (tests)

### Error 3: Bun install usa su -c con ruta variable
- Linea: 86-88
- Problema: `su -c 'curl -fsSL https://bun.sh/install | bash' "$USER"` puede fallar si el usuario no tiene shell interactivo o HOME no esta definido
- Solucion: Agregar `HOME=$HOME_DIR` al entorno: `su -c "HOME=$HOME_DIR curl -fsSL https://bun.sh/install | bash" "$USER"`

### Error 4: find para detectar subdirectorio del tar puede fallar
- Linea: 161 (`find "$TMP_DIR" -maxdepth 1 -mindepth 1 -type d | head -1`)
- Problema: Si el tar no tiene subdirectorio (archivos sueltos), SRC_DIR queda vacio y el fallback a TMP_DIR puede copiar archivos equivocados
- Solucion: Verificar que SRC_DIR contiene core/loop.js antes de copiar:
  `[ -f "$SRC_DIR/core/loop.js" ] || fail "Estructura del paquete incorrecta"`

### Error 5: .env se concatena, no se reemplaza
- Linea: 198 (`cat >> /opt/sypnose/.env`)
- Problema: Si el script se corre multiples veces (despues de borrar .env y recrear desde .env.example), las variables se duplican
- Solucion: Usar `cat >` en vez de `cat >>`, o verificar si las variables ya existen antes de escribir

### Error 6: clients.json vacio rompe el coordinator
- Linea: 224-229 (crea `{"clients":[]}`)
- Problema: El coordinator intenta hacer probes de los clients. Con array vacio, el loop Y1-Y5 corre pero no hace nada util. No es un error fatal, pero es confuso para el usuario
- Recomendacion: Agregar comentario prominente y ejemplo con placeholder

### Error 7: Systemd service template sed solo reemplaza User
- Linea: 406 (`sed "s|User=.*|User=$USER|g"`)
- Problema: Los templates tambien pueden tener WorkingDirectory y ExecStart con paths hardcodeados que incluyen el usuario anterior (gestoria)
- Solucion: Tambien reemplazar paths: `sed -e "s|User=.*|User=$USER|" -e "s|/home/gestoria|/home/$USER|g"`

### Error 8: Crontab no es idempotente si se edita manualmente
- Linea: 433-443
- Problema: Solo verifica "SYPNOSE v5.2" como marca. Si alguien edita la linea del cron pero deja la marca, se duplica en la siguiente ejecucion
- Riesgo: Bajo (el script solo se corre una vez normalmente)

---

## MEJORAS RECOMENDADAS

### Mejora 1: Agregar --check / --dry-run mode
El script deberia poder correrse solo para verificar sin cambiar nada:
```bash
install-sypnose-full.sh --check gestoria
# Solo muestra que se instalaria y que ya existe
```

### Mejora 2: Logrotate automatico
El script no configura logrotate para /var/log/sypnose/events/stream.jsonl.
Agregar:
```bash
cat > /etc/logrotate.d/sypnose << 'EOF'
/var/log/sypnose/events/stream.jsonl {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
/var/log/sypnose/janitor.log /var/log/sypnose/dream.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF
```

### Mejora 3: Verificar espacio en disco
Antes de instalar, verificar que hay al menos 1GB libre:
```bash
AVAIL=$(df -BG /opt | tail -1 | awk '{print $4}' | tr -d 'G')
[ "$AVAIL" -lt 1 ] && fail "Menos de 1GB libre en /opt"
```

### Mejora 4: Generar reporte de instalacion
Al final del script, guardar un resumen en /opt/sypnose/INSTALL-REPORT.txt:
```bash
cat > /opt/sypnose/INSTALL-REPORT.txt << EOF
Fecha: $(date -u)
Usuario: $USER
Node: $(node --version)
KB: $(curl -sf localhost:18791/health | jq -r .status 2>/dev/null || echo "no disponible")
CLIProxy: $(curl -sf localhost:8317/ | jq -r .message 2>/dev/null || echo "no disponible")
Tests: $([ $TEST_FAIL -eq 0 ] && echo "PASSED" || echo "FAILED")
EOF
```

### Mejora 5: Incluir Boris hooks en el paquete
Actualmente el paquete NO incluye los hooks Boris (son externos).
Para un servidor limpio, el instalador solo crea un README en templates/boris/.
Recomendacion: Copiar los 6 hooks reales a /opt/sypnose/templates/boris/ en el paquete.

### Mejora 6: Verificar compatibilidad de versions
El script instala Node.js 20.x pero el package.json dice `"engines": {"node": ">=18.0.0"}`.
Agregar verificacion post-install:
```bash
node -e "require('/opt/sypnose/core/loop')" 2>&1 || fail "loop.js no carga — verificar Node.js version"
```

---

## RESUMEN

| Tipo | Cantidad | Severidad |
|---|---|---|
| Errores | 8 | 2 altos (PATH, set -e), 6 medios |
| Mejoras | 6 | 2 importantes (logrotate, disk check), 4 nice-to-have |

**El script funciona** — syntax OK, 12 pasos correctos, verificacion final completa.
Los errores son edge cases que aparecerian en servidores con configuraciones atipicas.
Para nuestro servidor Contabo, funciona perfecto tal cual.

**Para un servidor limpio desconocido**, aplicar al menos: Error 2 (paths npm), Error 4 (verificar estructura tar), y Mejora 2 (logrotate).
