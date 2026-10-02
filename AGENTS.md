# AGENTS.md — Open PRP

Guía obligatoria para agentes que exploren o modifiquen este repositorio. Leer antes de generar código. La configuración y el código actuales son la fuente de verdad; mantener esta guía coherente con ellos.

## Requisitos del entorno

- **Node.js 22.12.0 o superior**, conforme a `engines.node` en `package.json`. Mantener este requisito sincronizado con el manifiesto.
- **pnpm** es el gestor de paquetes del proyecto y debe estar instalado. Usarlo al indicar comandos de dependencias y scripts al usuario.

## Responsabilidades y comandos

- **El usuario ejecuta todos los comandos con `pnpm`**: `pnpm install`, `pnpm add`, `pnpm update`, `pnpm remove`, `pnpm build`, `pnpm run ...`, `pnpm dev`, `pnpm preview`, `pnpm exec` y `pnpm dlx`, entre otros. El agente solo indica el comando exacto, para qué sirve y qué salida necesita recibir.
- El agente tampoco ejecuta instalaciones, builds, servidores, scripts de proyecto, seeds, migraciones ni despliegues mediante comandos equivalentes de Node, Astro, npm, npx, yarn u otras herramientas. No sustituir `pnpm` por otra herramienta para eludir esta regla. Node se gestiona con fnm y puede no estar en el PATH del shell.
- El agente puede explorar archivos, buscar referencias, revisar diffs y editar código/documentación. Debe comunicar qué verificó por inspección y qué queda pendiente de ejecución por el usuario.
- Las pruebas de guardar, editar o eliminar desde modales CRUD las realiza el usuario y comparte el resultado.
- Si hacen falta dependencias o cambios de producción, preparar los archivos y entregar al usuario los comandos o SQL necesarios; no ejecutarlos.

## Mantenimiento de documentación

- **Actualizar siempre este `AGENTS.md` en la misma tarea cuando haya cambios importantes**: funcionalidades, componentes relevantes, arquitectura, rutas, datos, dependencias, autenticación, despliegue o convenciones. Describir el comportamiento final y eliminar instrucciones obsoletas o contradictorias.
- La documentación de producto y técnica está unificada en `README.md` (fuente principal en español) y `README.en.md` (traducción inglesa). Actualizar primero el README español y después el inglés cuando el cambio afecte su contenido. Mantener enlaces e índice técnico coherentes; no crear archivos DOCS separados.
- No documentar funciones previstas como si ya existieran. Distinguir implementación actual y trabajo pendiente, especialmente en sitemap, RSS y mutaciones CRUD.

## Stack y coherencia tecnológica

Toda solución debe ser coherente con las tecnologías, versiones y APIs usadas por el proyecto; comprobar `package.json`, `astro.config.mjs` y los patrones existentes antes de modificarlo.

| Capa | Implementación actual | Regla |
|---|---|---|
| Framework | Astro 7, `output: "server"` | Priorizar SSR y componentes `.astro`; prerender solo para contenido público independiente de sesión y BD. |
| Interactividad | React 19, `@astrojs/react` | Usar islas solo cuando haga falta interactividad, con `client:load` en el consumidor Astro. |
| Estilos | Tailwind CSS 4, `@tailwindcss/vite` | Reutilizar tokens y clases existentes; Astro usa `class`, React `className`. |
| Lenguaje | TypeScript estricto | Sin `any`; tipos de dominio en `src/lib/types/`. Respetar las excepciones existentes de configuración y `db/seed.js` ESM. |
| Autenticación | Clerk, `@clerk/astro`, `@clerk/localizations` | Hooks desde `@clerk/astro/react`; servidor desde `@clerk/astro/server`. |
| Base de datos | Turso/libSQL, `@libsql/client/web` | Reutilizar `getDb()`, SQL parametrizado y repositorios; mantener compatibilidad con Netlify Functions. |
| Despliegue | Netlify, `@astrojs/netlify` | Mantener código de servidor y variables compatibles con el adapter actual. |
| Sitemap | `@astrojs/sitemap` | Mantener `site`, enlaces y rutas públicas coherentes. |

No introducir otra arquitectura, ORM, sistema de estilos o proveedor por conveniencia sin una necesidad de la tarea.

## Estructura e imports

- Páginas: `src/pages/[locale]/index.astro` para landing; `src/pages/[locale]/app/*` para app; `src/pages/api/*` para API sin prefijo de idioma.
- Layouts: `BaseLayout.astro` controla HTML, head, título, tema y ClientRouter; `AppLayout.astro` y `LandingLayout.astro` lo envuelven. Los layouts nuevos deben envolverlo y reenviar `title`.
- Componentes: `src/components/landing/`, `src/components/app/` y UI compartida en `src/components/ui/`. UI propia de app en `src/components/app/ui/`.
- Lógica de dominio y repositorios: `src/lib/modules/`; tipos: `src/lib/types/`; comportamiento browser: `src/lib/ui/`; traducciones: `src/lib/i18n/`.
- **Imports internos siempre con alias `@/` definido en `tsconfig.json` y extensión explícita** (`.ts`, `.tsx`, `.astro`, `.svg`, `.css`). Nunca usar `./` o `../` para importar código interno. Los paquetes conservan sus nombres de paquete.
- Importar el archivo concreto, sin barrels ni resolución implícita de directorios/`index.*`. Las rutas `index.ts` de API son endpoints, no barrels.
- SVGs en `src/assets/`, nombres kebab-case; identificador PascalCase con sufijo `Icon`. En React importar con `.svg?react`.
- Reutilizar componentes, utilidades y estilos compartidos; no duplicar funcionalidades entre secciones.

## SSR, datos y navegación

- **Priorizar Astro SSR en todo lo que sea posible y tenga sentido**: obtener datos y renderizar contenido en servidor cuando no requiera interacción en cliente. Usar islas React solo para el comportamiento dinámico necesario; no convertir una sección completa a React si puede conservar su contenido en Astro SSR.
- Las páginas de app mantienen un shell síncrono y delegan queries a componentes `*Content.astro` por sección para permitir streaming del contenido.
- Ejecutar queries independientes con `Promise.all`; no acumular round-trips de Turso en serie. Leer `Astro.locals.user` para datos del usuario ya consultados por middleware.
- Islas React reciben datos iniciales SSR por props (`initialData={JSON.stringify(...)}`); refetchean al cambiar filtros o tras mutaciones según el patrón existente.
- `src/lib/dashboard/load.ts` carga el dashboard directamente desde repositorios. No recalcular deudas ni hacer upserts por cada visita; el cálculo de tarjetas se solicita en cliente a `/api/card-monthly/calculate`.
- `prefetch: false` en Astro; no añadir prefetch. La configuración actual de Clerk tiene `prefetchUI: true`; es una opción distinta del prefetch de navegación.
- Los scripts module de Astro se ejecutan una vez con ClientRouter. Inicializar listeners ligados a elementos reemplazados en `astro:page-load`; listeners globales sobre `document` se registran una vez. No usar `data-astro-rerun` para scripts con imports.
- Mantener el tema antes del primer paint y en `astro:after-swap`, la barra global `#nav-loading` y el respeto a `prefers-reduced-motion`.
- Sidebar desktop de ancho `w-64`; móvil como drawer con overlay. Navegación data-driven con hrefs localizados. Mantener placeholder fijo y `transition:persist="user-button"` del avatar de Clerk.

## Idiomas y textos

- Locales actuales: `es` y `en`. No añadir idiomas salvo petición. Todos llevan prefijo; `/` redirige a `/es`.
- Resolver locale SSR con `resolveLocale(Astro.currentLocale)`; props tipadas con `LocaleCode` (salvo el puente intencional `ClerkLocaleBridge`). Generar URLs con `getRelativeLocaleUrl`.
- Todo texto UI vive en `es.ts` y `en.ts`; añadir ambos antes de usarlo. Consumir con `t = getLocaleDict(locale)` o `useLocaleDict()`, nunca importar `es` para leer etiquetas en componentes.
- Strings dinámicos como funciones del diccionario; strings compartidos en el objeto interno `shared`. Clases, IDs, atributos `data-*` y query params no son textos UI.
- Usar helpers de `form-fields.ts`, `filter-fields.ts` y `general-fields.ts` parametrizados con `t`; no duplicar fields ni etiquetas reutilizables inline.
- Pasar locale a `monthLabel`, `formatDate` y `formatDateTime`. El cambio de idioma conserva ruta y query string.
- Datos de sistema en inglés, minúsculas y kebab-case; datos del usuario se conservan exactamente como los escribió. Display mediante `displayCategoryName` y `displayPaymentMethodName`.

## Autenticación y secretos

- Middleware Clerk resuelve el usuario y expone `userId`, `createdAt` y `user` en locals. Sin sesión, protege las rutas app excepto login y redirige al login localizado; las landings son públicas.
- Sincronizar perfil desde Clerk solo si falta email o display_name; evitar una llamada remota en cada request.
- Localización Clerk mediante `getClerkLocalization` y `ClerkLocaleBridge`. `UserButton` usa `/es/app/login` al cerrar sesión.
- Variables declaradas con `envField` en Astro: `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `CLERK_SECRET_KEY` (servidor/secretas) y `PUBLIC_CLERK_PUBLISHABLE_KEY` (cliente/pública). No exponer secretos al cliente ni incluirlos en logs o documentación.
- Toda operación de datos debe respetar el scope por `userId`; no confiar en IDs enviados por cliente para autorizar acceso.

## Base de datos y API

- Esquema modular e idempotente en `db/schemas/*.sql`. Semilla existente en `db/seed.js`.
- Cada cambio de esquema actualiza el SQL final correspondiente y entrega el SQL de migración de producción al usuario para que lo ejecute.
- Usar `getDb()` de `src/lib/db/client.ts`, `db.execute({ sql, args })` y binds `?`; args tipados `(string | number | boolean | null)[]`. Mantener `nextSeq` existente.
- Cashback no tiene columna `updated_at`: tanto `insertRow` como `applyUpdate` deben recibir `withUpdatedAt: false` en su repositorio.
- Reutilizar `createIdRoutes` y `createIndexRoutes` de `src/lib/api-routes.ts` cuando aplique. Rutas custom también usan `withErrorHandling` y `readJsonBody` de `api-helpers.ts`.
- Reutilizar helpers de autenticación, respuestas JSON, paginación, booleanos y rangos de fechas. JSON inválido devuelve 400; errores inesperados se registran y devuelven JSON 500.
- Mantener duplicate-check de categorías (409), snapshots mensuales de recurrentes y sincronización tarjeta/método de pago al crear, actualizar o borrar.
- Compras: artículos pertenecen a listas (`list_id`); finalizar completa sus artículos y borrar una lista elimina sus artículos. Nombre opcional con fecha/hora localizada como fallback visual.
- Pagos parciales: `statement_balance` es saldo bruto; `paid_amount` guarda el pago. Un mes con `is_paid` muestra neto 0; el remanente se registra en el mes siguiente mediante `CARRYOVER_DESCRIPTION_PREFIX`. Evitar contar la misma deuda dos veces.

## UI, formularios y accesibilidad

- `CrudModal` compone `CrudField.tsx` (render de campos), `useCrudModal.ts` (carga y guardado) y `crud-form.ts` (defaults, visibilidad y payload). Los tipos viven en `src/lib/types/crud.ts`: `Field` es una unión discriminada, exige opciones para selects y limita `step`/`min` a números. Tipar los arrays de campos antes de serializarlos en SSR.
- La carga de edición muestra estado y errores dentro del modal, cancela peticiones al cerrar/cambiar registro y bloquea guardar hasta cargar los datos. Los números se convierten al enviar con `Number`, validan finitud y mínimo; vacío opcional es `null`, vacío obligatorio es error. Nunca convertir una entrada inválida en cero.

- Reutilizar `Select`, `MultiSelect`, `TabBar`, `TabBarWithMonth`, `MonthSelector`, `PageHeader`, `DataTable`, `CrudModal`, `FormModal`, `ConfirmDelete`, `DeleteHandler` y `ToggleHandler`.
- Filtro de mes: `Select`; otros filtros con opciones: `MultiSelect`. Todas las opciones seleccionadas equivalen a no restringir.
- Orden de formulario: fecha → tipo → descripción → montos → moneda → método de pago/tarjeta → categoría → específicos. Usar helpers de campos.
- `required: true` muestra asterisco rojo y debe corresponder a `NOT NULL`. Decimales como raw string hasta submit; color picker de ancho completo, sin reset.
- Labels e inputs con `htmlFor`/`id`. Modales con `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape y autofocus. `DataTable` requiere `ariaLabel`.
- Disparadores CRUD: `data-create="module"`, `data-edit-{module}="id"`. CTA móvil junto al título, a la derecha.
- No usar `alert()`, `confirm()` ni `prompt()` nativos; errores inline con `role="alert"` y borrado mediante `ConfirmDelete`.
- Tabs con botones, roles APG, `aria-selected`, `aria-controls`, roving tabIndex y teclas ←/→/Home/End; paneles asociados. En móvil, tabs como Select junto al filtro de mes.
- Mantener `focus-visible`, contraste, aria-labels traducidos y `aria-hidden` en iconos decorativos. Dropdowns portaleados y adaptados al viewport.
- Usar tokens existentes de `global.css` (surface, panel, border, string, primary, success, danger, warning, info y variantes), con soporte claro/oscuro.
- En móvil, filtros de dos en dos, último impar a ancho completo; search y Limpiar al final en líneas propias. Cards de dos en dos, última impar ocupa ambas columnas.

## Filtros, tabs y estado en URL

- Cada consumidor de `useFilteredData` declara `keys`, `locale` y defaults opcionales (tipos en `src/lib/types/filters.ts`). El hook restaura y modifica solo sus params, elimina los retirados y conserva params ajenos, hash e `history.state`; los defaults no se escriben en URL. Plazos usa `active_only=true` por defecto y `false` para todos.
- El hook valida HTTP y el envelope `{ success, data, error }`, cancela peticiones anteriores y descarta respuestas obsoletas, limpia errores al recuperarse y respeta datos iniciales SSR. `searchValue` controla la búsqueda con debounce de 300 ms y limpieza al desmontar; `popstate` restaura filtros y búsqueda.

- URL como fuente de verdad: restaurar filtros, search, tab y página desde query params. Predeterminados no agregan params; al volver al default eliminarlos.
- Cambios de filtros/tabs actualizan UI y URL con history, sin recarga. Combinar filtros con AND y preservar params ajenos. Tab mediante `?tab=`, adoptando hashes legacy solo por compatibilidad.
- `useFilteredData` para componentes `*Filterable`; mostrar su `error` en banner `role="alert"`. Transacciones paginan a 50; cambiar/limpiar filtros vuelve a página 1. API devuelve `{ data, total, page, pageSize }`.
- `TabBarWithMonth` emite `monthchange` con `detail: { month }`; recurrentes y tarjetas lo escuchan y refetchean. Fuera de history, no permitir la opción de todos los meses.
- Resúmenes usan mes actual por defecto; registros/historial usan últimos 12 meses. Generar opciones desde el alta, máximo últimos 12 meses, más mes siguiente. Reutilizar `lastYearWindow` y helpers de fecha en SSR/API.
- **Actualización tras mutaciones sin recarga**: `useCrudModal`, `ConfirmDelete` y el handler delegado de toggles emiten `datachange` mediante `notifyDataChange(module)` de `src/lib/ui/data-refresh.ts`. El coordinador actualiza solo la sección visible afectada, según su mapa de dependencias. Registrar allí las dependencias al añadir módulos relacionados.
- Transacciones, cashback y despensa declaran `data-refresh-mode="api"`; `useFilteredData` registra un refetch abortable que conserva filtros y búsqueda. Un cambio en un módulo relacionado usa SSR para renovar también las opciones derivadas. Tras borrar, la paginación se ajusta si la página actual dejó de existir.
- Las demás secciones conservan Astro SSR: se solicita la URL actual con `X-Open-PRP-Refresh: content`. `AppLayout` devuelve solo el slot (sin consultar/renderizar sidebar ni shell), con `Cache-Control: private, no-store` y `Vary: X-Open-PRP-Refresh`. El cliente sustituye únicamente `[data-module]` mediante `swapFunctions.swapBodyElement`, conserva URL/scroll y emite `astro:after-swap` para limpiar las raíces React retiradas. Las islas nuevas se hidratan; no ejecutar de nuevo scripts de la respuesta ni emitir `astro:page-load` para este refresco parcial.
- `RefreshStatus.astro` muestra progreso y fallo de actualización con reintento. La mutación ya completada no se repite al reintentar. Cancelar refrescos supersedidos y al navegar. No añadir recargas completas como fallback automático.
- `ToggleHandler.astro` declara configuración en atributos; `toggle-handler.ts` registra un único listener delegado, restaura el checkbox y muestra error si falla la mutación. Los listeners del contenido SSR deben sobrevivir al reemplazo parcial sin duplicarse.
- `FilterSelect` conserva su navegación existente por href.

## Sitemap, robots y RSS

- `astro.config.mjs` configura `site: 'https://oprp.marcvspt.tech'` e integra `sitemap()` desde `@astrojs/sitemap`.
- `BaseLayout.astro` enlaza `/sitemap-index.xml`; `src/pages/robots.txt.ts` expone `robots.txt`, permite rastreo (`Allow: /`) y anuncia el sitemap usando `Astro.site`.
- Las landings `/es` y `/en` se prerenderizan con `getStaticPaths` y `LOCALES`; la app/login son SSR. Revisar cobertura del sitemap al añadir rutas públicas; no asumir que enumera automáticamente páginas SSR dinámicas.
- No incluir datos privados ni URLs dependientes de sesión en sitemap o feeds. `robots.txt` no sustituye la autenticación ni garantiza exclusión de indexación.
- **RSS no está implementado**: no hay dependencia `@astrojs/rss` ni endpoint de feed. Sitemap y RSS son mecanismos distintos. No afirmar que existe un feed ni añadirlo sin una necesidad de la tarea.
- Si se solicita RSS, mantener una implementación coherente con Astro, contenido público, URLs basadas en `site`, localización y políticas de privacidad; indicar al usuario la instalación necesaria y actualizar esta guía y los README.

## Entrega y validación

- Revisar archivos afectados y diff, respetando cambios previos del usuario. No revertir modificaciones ajenas.
- Explicar qué cambió y cualquier limitación real. Para validaciones de ejecución, dar al usuario el comando exacto y esperar su salida para corregir errores.
- No afirmar que un build, instalación, prueba CRUD o despliegue pasó si el usuario no proporcionó el resultado.
