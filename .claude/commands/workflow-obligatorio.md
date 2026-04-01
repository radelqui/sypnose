# REGLA OBLIGATORIA — WORKFLOW DE EJECUCIÓN

## ANTES de tocar código (OBLIGATORIO)
1. git pull origin $(git branch --show-current)
2. git tag pre-[tarea] -m 'Punto de retorno' && git push origin pre-[tarea]
3. Planificar en waves: Wave 1 (paralelo, sin deps) → Wave 2 (depende de Wave 1)

## EJECUCIÓN (OBLIGATORIO para >2 archivos)
4. TeamCreate + teammates con model: sonnet — NUNCA opus para teammates
5. Cada teammate: scope limitado, prompt específico

## DESPUÉS de cada trabajo (OBLIGATORIO)
7. git add [archivos] + git commit -m '[TAG] descripción'
8. git push origin $(git branch --show-current)
9. Documentar en .brain/history.md — fecha, agente, archivos, cambios, pendiente

## VERIFICACIÓN VISUAL OBLIGATORIA (Boris Verification Loop)
- NINGÚN trabajo se considera terminado hasta que lo VERIFICAS
- Para CADA cambio que toque servicios, configs, o seguridad:
  1. Verifica que el servicio funciona (curl, systemctl status, docker ps)
  2. Verifica logs — que no hay errores
  3. SOLO después de verificar puedes hacer commit y decir listo
- Si no verificas, el trabajo NO está hecho. Punto.

## TAG DE RETORNO OBLIGATORIO
- ANTES de tocar código: git tag pre-[tarea] -m 'Punto de retorno' && git push origin pre-[tarea]
- Sin tag de retorno = NO empiezas a trabajar

## GUARDAR EN MEMORIA OBLIGATORIO
- Después de CADA tarea completada:
  1. Documentar en .brain/history.md — fecha, archivos, cambios, pendiente
  2. Actualizar .brain/task.md si cambió el estado del proyecto
  3. git add .brain/ && git commit -m '[BRAIN] sesion [fecha]: [resumen]' && git push
- Sin documentación = trabajo no reconocido

## BACKUP ANTES DE DEPLOY (OBLIGATORIO)
- ANTES de hacer swap/restart/rebuild de un container Docker:
  1. `docker commit [container-actual] [nombre]-backup-[fecha]`
  2. Verificar que la imagen backup existe: `docker images | grep backup`
  3. SOLO después hacer el deploy/swap
  4. Si falla → restaurar: `docker run` con la imagen backup
- Sin backup = NO haces deploy. Punto.
