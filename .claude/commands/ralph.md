# /ralph - Ejecutar Loop Autónomo en Servidor

Ejecuta Ralph en el servidor Contabo para un proyecto específico.

## Uso
```
/ralph [proyecto]
```

## Proyectos disponibles
- `facturaia` - ~/eas-builds/FacturaScannerApp
- `iatrader` - ~/IATRADER
- `gestoriard` - ~/factory/apps/gestoriard

## Instrucciones para el Agente

Cuando el usuario ejecute `/ralph [proyecto]`:

1. **Verificar proyecto válido**
   - facturaia, iatrader, gestoriard

2. **Verificar PROMPT.md existe**
   ```bash
   ssh -p 2024 gestoria@217.216.48.91 "cat ~/[path]/PROMPT.md | head -20"
   ```

3. **Mostrar contenido del PROMPT.md al usuario**
   - Confirmar que las instrucciones son correctas

4. **Ejecutar Ralph en background**
   ```bash
   ssh -p 2024 gestoria@217.216.48.91 "cd ~/[path] && nohup /opt/ralph-claude-code/ralph_loop.sh -v > ralph.log 2>&1 &"
   ```

5. **Informar al usuario**
   - URL del proyecto
   - Cómo verificar logs: `ssh -p 2024 gestoria@217.216.48.91 "tail -f ~/[path]/ralph.log"`

## Paths por Proyecto

| Proyecto | Path en Servidor |
|----------|------------------|
| facturaia | ~/eas-builds/FacturaScannerApp |
| iatrader | ~/IATRADER |
| gestoriard | ~/factory/apps/gestoriard |

## Ejemplo de Ejecución

```
Usuario: /ralph facturaia

Agente:
1. Conecta al servidor
2. Verifica PROMPT.md en ~/eas-builds/FacturaScannerApp
3. Muestra las instrucciones del PROMPT.md
4. Ejecuta: cd ~/eas-builds/FacturaScannerApp && /opt/ralph-claude-code/ralph_loop.sh -v
5. Informa: "Ralph iniciado en facturaia. Logs: tail -f ~/eas-builds/FacturaScannerApp/ralph.log"
```
