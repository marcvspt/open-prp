# Guía de contribución

Gracias por contribuir a Open PRP, la aplicación de finanzas personales y organización diaria. Esta guía describe cómo preparar tus cambios y escribir mensajes de commit consistentes.

## Preparar una contribución

1. Consulta [README.md](README.md) para configurar el proyecto, [package.json](package.json) para los requisitos de Node.js y scripts disponibles y [AGENTS.md](AGENTS.md) para conocer sus convenciones técnicas.
2. Si colaboras desde un fork, crea una rama para tu cambio y mantén cada contribución enfocada en un objetivo.
3. Implementa el cambio siguiendo la estructura, los componentes y los estilos existentes.
4. Para cambios de código, configuración o contenido publicado, ejecuta `pnpm build`. Si modificas la interfaz o el contenido, revisa también el resultado con `pnpm preview` en móvil y escritorio, incluyendo navegación por teclado. Los cambios únicamente de documentación no requieren una compilación.
5. Abre un pull request que explique qué cambia, por qué y cómo lo verificaste. Incluye capturas si modificas la interfaz y enlaza el issue relacionado cuando exista.

Usa pnpm y conserva `pnpm-lock.yaml` y `pnpm-workspace.yaml` coherentes con las dependencias. No edites salidas generadas en `dist/`, `.astro/`, `.netlify/` ni dependencias en `node_modules/`. No incluyas archivos `.env`, credenciales ni datos personales en commits, capturas o registros.

Cuando trabajes con un agente, el propietario ejecuta las instalaciones y los comandos del proyecto; el agente prepara los cambios e indica los comandos necesarios, según [AGENTS.md](AGENTS.md). Indica siempre qué comprobaste y qué quedó pendiente. Actualmente no hay scripts de test, lint ni check en `package.json`; la compilación no sustituye esas comprobaciones.

## Convenciones del proyecto

- Mantén Astro SSR, islas React para la interacción, Tailwind CSS 4, Clerk y Turso/libSQL, con compatibilidad con el adaptador Netlify. Las landings públicas están prerenderizadas; la app y el login usan SSR.
- Organiza páginas en `src/pages/[locale]/`, endpoints sin prefijo de idioma en `src/pages/api/`, repositorios en `src/lib/modules/` y tipos de dominio en `src/lib/types/`. Los imports internos usan `@/` y extensión explícita.
- Mantén los textos traducibles en los diccionarios `es.ts` y `en.ts` de `src/lib/i18n/`. La marca se comparte desde `site.ts`, los enlaces desde `links.ts`, los menús desde `navigation.ts` y las características desde `catalog/landing.ts`, vinculadas por ID. Actualiza ambos idiomas y conserva ruta y query string al cambiar de locale. No traduzcas los datos escritos por el usuario.
- Toda operación de datos debe respetar el usuario autenticado. Usa SQL parametrizado y los repositorios existentes; no autorices el acceso basándote únicamente en IDs enviados desde el cliente.
- Usa `src/lib/ui/api-client.ts` para peticiones JSON. El contrato de error usa `error: ApiErrorCode` y `params` opcionales, con mensajes en ambos diccionarios y contratos en `src/lib/types/api.ts`. Las utilidades de API y BD viven en `src/lib/server/` y consumen secretos con `astro:env/server`; no las importes desde cliente. Los fragmentos HTML SSR usan el coordinador de `src/lib/ui/data-refresh.ts`. No ocultes errores como listas vacías ni repitas mutaciones automáticamente.
- Reutiliza los formularios, modales, filtros, tablas y tokens de los temas claro y oscuro. Mantén filtros, pestañas, búsqueda y paginación en la URL y la actualización de la sección afectada tras guardar o eliminar.
- Si cambias la base de datos, actualiza el esquema correspondiente en `db/schemas/` y entrega el SQL de migración para producción por separado. El propietario ejecuta seeds y migraciones; no uses datos ni credenciales de producción para preparar una contribución.

## Qué comprobar según el cambio

- **Configuración local:** usa credenciales de desarrollo de Clerk y una base Turso de desarrollo. `pnpm db:seed:dev` carga `.env.development` y escribe en la base configurada allí; confirma el destino antes de ejecutarlo.
- **Autenticación y datos:** revisa acceso con y sin sesión y el aislamiento entre usuarios en las rutas y operaciones afectadas.
- **CRUD y navegación:** comprueba crear, editar y eliminar, errores de carga o guardado, actualización de datos relacionados y conservación de filtros, pestañas y paginación. Distingue un guardado fallido de un guardado correcto cuyo refresco visual falló.
- **Cálculos de finanzas:** si modificas tarjetas, plazos o pagos recurrentes, comprueba fechas de corte, meses cortos, última cuota y pagos parciales, sin duplicar deuda ni repetir pagos.
- **Interfaz e idiomas:** revisa las vistas afectadas en español e inglés, temas claro y oscuro, móvil y escritorio; incluye teclado, foco, Escape y estados de carga, error y vacío.
- **Rutas públicas y PWA:** si las modificas, comprueba landings, sitemap, robots y que el service worker no sirva HTML autenticado desde caché. Actualmente no hay feed RSS.

Cuando trabajes con un agente, el propietario realiza también las pruebas CRUD y comparte los resultados, conforme a [AGENTS.md](AGENTS.md).

Actualiza primero [README.md](README.md) y después [README.en.md](README.en.md) cuando cambien configuración o uso. Actualiza [AGENTS.md](AGENTS.md) cuando cambien arquitectura, datos, autenticación o convenciones.

## Mensajes de commit

Usa un prefijo con inicial mayúscula, seguido de dos puntos, un espacio y una descripción breve en español:

```text
Prefijo: descripción del cambio
```

Conservamos `Fix:` para corregir errores y `Feature:` para añadir funcionalidad. Usa los siguientes prefijos según el propósito principal del cambio:

| Prefijo | Cuándo usarlo | Ejemplo |
| --- | --- | --- |
| `Fix:` | Corregir un error de comportamiento o presentación. | `Fix: corrige el cálculo del saldo pendiente` |
| `Feature:` | Añadir una funcionalidad. | `Feature: agrega un filtro de transacciones` |
| `Refactor:` | Reorganizar código sin cambiar su comportamiento. | `Refactor: simplifica los repositorios de tarjetas` |
| `Style:` | Ajustar el formato del código, como espacios o indentación. | `Style: unifica la indentación de componentes` |
| `UI:` | Modificar el diseño o la presentación visual. | `UI: ajusta el espaciado del encabezado` |
| `Docs:` | Añadir o actualizar documentación. | `Docs: agrega la guía de contribución` |
| `Test:` | Añadir o modificar pruebas. | `Test: cubre los pagos parciales de tarjetas` |
| `Perf:` | Mejorar el rendimiento. | `Perf: reduce el tamaño de las imágenes` |
| `Build:` | Modificar dependencias o configuración de compilación. | `Build: actualiza las dependencias de Astro` |
| `CI:` | Modificar automatizaciones de integración o despliegue. | `CI: agrega la validación de producción` |
| `Chore:` | Realizar mantenimiento que no encaje en los anteriores. | `Chore: actualiza los archivos ignorados` |
| `Revert:` | Deshacer un cambio anterior. | `Revert: revierte el cambio del menú` |

Puedes indicar el área entre paréntesis cuando ayude a identificar el cambio:

```text
Feature(transactions): agrega un filtro por moneda
Fix(cards): corrige el saldo de pagos parciales
Docs(readme): actualiza los requisitos de Node
```

- Escribe descripciones concretas, como «corrige la validación del correo», en lugar de «varios cambios».
- Usa verbos como «agrega», «corrige», «actualiza» o «elimina» y evita el punto final en el título.
- Usa `Style:` para formato del código y `UI:` para cambios visuales. Si corriges un defecto visual, usa `Fix:`.
- Separa cambios independientes en commits distintos. Si un cambio necesita varios archivos, pueden formar parte del mismo commit.
- Para explicar una decisión o un cambio incompatible, añade detalles en el cuerpo del commit después de una línea en blanco.

Estos prefijos son la convención del proyecto. Mantén `Fix:` y `Feature:` en lugar de alternarlos con `fix:` y `feat:`.
