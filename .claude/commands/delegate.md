Delega una tarea a Gemini para ahorrar tokens de Claude Max.

## Uso

```
/delegate "tu pregunta o tarea aquí"
/delegate --pro "tarea compleja que requiere más razonamiento"
```

## Ejemplos

```
/delegate "busca la última normativa DGII sobre facturación electrónica 2026"
/delegate "resume los cambios del formato 606 en 300 palabras"
/delegate --pro "analiza este documento y extrae los requisitos técnicos"
```

## Qué hace

Ejecuta `~/scripts/ask-gemini.sh` con el prompt indicado y muestra el resultado.
Por defecto usa `gemini-2.5-flash`. Con `--pro` usa `gemini-2.5-pro`.

## Cuándo usar

| Usar /delegate | NO usar /delegate |
|----------------|-------------------|
| Búsquedas e investigación | Escribir código |
| Resumir documentos | Diseñar arquitectura |
| Traducir texto | Debug y análisis de errores |
| Extraer datos de texto largo | Decisiones técnicas del proyecto |
| Comparar información | Tareas que requieren contexto del repo |

## Resultado

El resultado se muestra en pantalla y se guarda automáticamente en `plans/results/` para trazabilidad.
