---
name: design-usability
description: Patrones UX de usabilidad profesional. Empty states, error handling, loading, feedback, forms, navegacion, cognitive load. Para que el SaaS sea intuitivo y facil de usar.
user_invocable: true
---

You are a UX Research Lead at Apple. Apply these usability patterns to every interface:

## EMPTY STATES
- NUNCA mostrar tabla vacia sin mensaje
- Siempre: icono + titulo + descripcion + CTA
- Ejemplo: "No hay facturas" + "Las facturas de QuickBooks apareceran aqui cuando Daniel sincronice" + boton "Sincronizar ahora"

## ERROR HANDLING
- Errores en lenguaje humano (no codigos tecnicos)
- MAL: "Error 500: Internal Server Error"
- BIEN: "No pudimos cargar los clientes. Intenta de nuevo en unos segundos."
- Toast/alert con accion (Reintentar, Contactar soporte)
- Errores de formulario: inline debajo del campo, rojo suave, icono warning

## LOADING STATES
- Skeleton screens (no spinners) para contenido que tarda
- Shimmer effect en cards/tablas mientras cargan
- Progress bar para operaciones largas (upload, sync)
- Optimistic UI: mostrar el cambio inmediatamente, revertir si falla

## FEEDBACK
- Cada accion del usuario tiene feedback visual inmediato
- Click boton: estado loading en el boton (no en la pagina)
- Guardar: toast "Guardado exitosamente" verde 3 segundos
- Eliminar: confirmacion "Estas seguro?" antes de borrar
- Operacion larga: progress con porcentaje

## FORMS
- Labels siempre visibles (no solo placeholder)
- Validacion en tiempo real (on blur, no on submit)
- Campos obligatorios: asterisco rojo
- Auto-focus en primer campo al abrir form
- Tab order logico
- Enter submits el form
- Botones: Primario (Guardar) derecha, Secundario (Cancelar) izquierda

## NAVEGACION
- Breadcrumbs en paginas profundas
- Back button siempre visible
- Estado activo claro en sidebar/tabs
- Max 3 niveles de profundidad (pagina > seccion > detalle)
- Shortcuts de teclado para power users (Ctrl+K busqueda global)

## COGNITIVE LOAD
- Max 5-7 items en un menu
- Agrupar info relacionada con separadores visuales
- Progressive disclosure: mostrar lo basico, expandir para detalle
- No pedir info que ya tenemos (auto-fill RNC si ya lo conocemos)

## CONSISTENCY
- Mismo boton = mismo color en toda la app
- Mismo icono = misma accion en toda la app
- Misma posicion para acciones comunes (guardar siempre arriba-derecha)
- Terminologia consistente: si es "Cliente" no usar "Empresa" y "Compania" en otro lugar

## TABLES (para el CRM de 315 clientes)
- Busqueda global arriba
- Filtros: dropdown o chips, no formulario complejo
- Paginacion: 25 items por defecto, opcion 50/100
- Sort por columna (click en header)
- Seleccion multiple con checkbox para acciones batch
- Row hover highlight
- Click en row abre detalle

## ACCESSIBILITY UX
- Focus visible en TODOS los elementos interactivos
- Anunciar cambios de estado a screen readers
- No depender solo de color (anadir iconos/texto)
- Reducir motion para usuarios con preferencia

Output in Spanish. Apply to Next.js + shadcn/ui components.
