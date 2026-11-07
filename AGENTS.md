# AGENTS.md — Open PRP

Guía obligatoria para agentes que exploren o modifiquen este repositorio. Leer antes de generar código. La configuración y el código actuales son la fuente de verdad; mantener esta guía coherente con ellos.

## Contribuciones y mensajes de commit

- Seguir [CONTRIBUTING.md](CONTRIBUTING.md) para preparar contribuciones y redactar mensajes de commit; esa guía define el formato, los prefijos y la separación de cambios independientes.
- Al entregar cambios, incluir siempre una recomendación de mensaje de commit para los cambios de la tarea. Si se solicita cubrir todos los cambios pendientes, revisar `git status`, los diffs preparados y sin preparar y los archivos nuevos no ignorados antes de redactarla.
- Recomendar un mensaje no autoriza realizar el commit ni publicar cambios.

## Requisitos del entorno

- **Node.js 24.0.0 o superior**, conforme a `engines.node` en `package.json`. Mantener este requisito sincronizado con el manifiesto.
- **pnpm** es el gestor de paquetes del proyecto y debe estar instalado. Usarlo al indicar comandos de dependencias y scripts al usuario.

## Responsabilidades y comandos

- **El usuario ejecuta todos los comandos con `pnpm`**: `pnpm install`, `pnpm add`, `pnpm update`, `pnpm remove`, `pnpm build`, `pnpm run ...`, `pnpm dev`, `pnpm preview`, `pnpm exec` y `pnpm dlx`, entre otros. El agente solo indica el comando exacto, para qué sirve y qué salida necesita recibir.
- El agente tampoco ejecuta instalaciones, builds, servidores, scripts de proyecto, seeds, migraciones ni despliegues mediante comandos equivalentes de Node, Astro, npm, npx, yarn u otras herramientas. No sustituir `pnpm` por otra herramienta para eludir esta regla. Node se gestiona con fnm y puede no estar en el PATH del shell.
- El agente puede explorar archivos, buscar referencias, revisar diffs y editar código/documentación. Debe comunicar qué verificó por inspección y qué queda pendiente de ejecución por el usuario.
- Las pruebas de guardar, editar o eliminar desde modales CRUD las realiza el usuario y comparte el resultado.
- Si hacen falta dependencias o cambios de producción, preparar los archivos del proyecto necesarios y entregar al usuario los comandos; no ejecutarlos. El SQL para actualizar la base de datos de producción se entrega directamente aquí en el chat, en bloques de código SQL listos para copiar, sin generar archivos de migración ni otros archivos separados para entregarlo.

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
| Gráficas | Recharts 3 | Preparar datos agregados en servidor y usar tokens existentes para temas claro y oscuro. |
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
- Identidad invariable del producto en `src/lib/site.ts`; URLs externas en `src/lib/links.ts`; menús localizados en `src/lib/navigation.ts`; orden e iconos de características en `src/lib/catalog/landing.ts`. Relacionar el catálogo con los textos por ID estable, nunca por posición.
- Marca visual: `src/assets/logo.svg` contiene el icono y «Open PRP» en trazados, sin fuentes externas. Reutilizar `BrandLogo.astro` en landing, sidebar y login; usa el token primary para ambos temas y el nombre accesible de `SITE_DATA.name`. `src/assets/logo-icon.svg` es la versión independiente del mismo icono. `BaseLayout.astro` lo importa con `?url&no-inline` como favicon: en producción se emite como archivo con hash para renovar su URL al cambiar y evitar reutilizar el favicon antiguo en caché. `public/favicon.svg` conserva una copia idéntica para accesos directos a la ruta anterior; mantenerla sincronizada con el icono, el símbolo del logo completo y `public/favicon.ico` como respaldo.
- Utilidades de API y BD en `src/lib/server/`; los repositorios permanecen en `src/lib/modules/` y son de servidor, salvo utilidades puras compartidas como `card-monthly/carryover.ts`. No importar repositorios, BD ni `astro:env/server` desde islas o scripts browser, tampoco indirectamente.
- Importar tipos desde `@/lib/types/<archivo>.ts`. `types/api.ts` contiene envelopes, paginación y códigos de error; `types/site.ts` contiene contratos de navegación y características. No restaurar `@/types/` ni el barrel `general.ts`.
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
- El Dashboard reutiliza `TabBarWithMonth` con un selector mensual compartido entre Resumen (predeterminada) y Analíticas (`?tab=analytics`). `DashboardPanels.astro` carga los datos una vez y `monthchange` actualiza ambos paneles mediante el fragmento SSR `[data-module="dashboard"]`. Las métricas de Resumen conservan sus reglas de balance.
- En Analíticas, el selector compartido indica el mes de las gráficas. Los encabezados de Actividad diaria y Gastos por categoría muestran sus títulos. El destacado de categoría muestra el nombre y el importe.
- Crear gráficas de Analíticas con Recharts 3 en islas React `client:load`, `ResponsiveContainer`, etiquetas y tooltips localizados, y tokens del proyecto para temas claro y oscuro. Preparar las series en servidor y compartir el filtro de mes del Dashboard. Separar importes por moneda, usar la preferida si tiene datos y reutilizar `Select` si hay varias. Usar `chartAmountFormatters` de `src/lib/format.ts` para ejes, tooltips y totales. En español, usar `es-MX` con coma para miles y punto decimal (`12,345.67 MXN`). En inglés, usar `en-US`. Conservar dos decimales y el código de moneda en importes detallados.
- Las gráficas reutilizan el conjunto mensual de `loadDashboardMonth`: transacciones y cashback filtrados por las reglas del balance, cuotas vigentes de `findSummaryByMonth` y recurrentes activos de su mes asignado, incluidos los pendientes. Excluir cargos sintéticos de saldos trasladados para evitar duplicar compras. `CategoryExpensesChart.tsx` usa barras apiladas de gastos por categoría y origen. Agrupar categorías ausentes como «Sin categoría».
- `DailyActivityChart.tsx` usa dos áreas superpuestas de ingresos y gastos con interpolación `monotoneX` para suavizar los picos conservando los puntos diarios. `monthly-activity.ts` coloca gastos y cashback de crédito en el día de corte del mes filtrado, y los demás movimientos con fecha en su propio día. Las cuotas sin corte usan el día de compra ajustado a meses cortos. Los recurrentes sin corte usan su fecha de pago cuando cae en el mes asignado. Los importes sin día atribuible solo cuentan en los desgloses mensuales correspondientes.
- `MonthlyMovementCharts.tsx` usa dos pasteles con hasta diez porciones por tipo y moneda. Cuando hay más de diez movimientos de importe positivo, muestra los nueve mayores y reúne todos los restantes en «Otros» como última porción. El tooltip muestra descripción, categoría e importe para cada movimiento individual, y suma y conteo para «Otros». También usa barras horizontales ordenadas por importe para gastos e ingresos por método de pago. En gastos, separar las tarjetas por ID y mostrar el nombre registrado. En ingresos, agrupar tarjetas por crédito, débito y vales, incluido el cashback de la tarjeta asociada. Conservar los demás métodos por nombre.
- El bloque de tarjetas del Dashboard suma el saldo pendiente de los estados de cuenta registrados, omite meses marcados como pagados y ordena las tarjetas pendientes por vencimiento. Distingue ausencia de estados de cuenta de ausencia de saldo pendiente registrado. Enlaza a Tarjetas para el mismo mes.
- Balance del dashboard: gastos con crédito y cashback asociado usan `cardStatementPeriod` del mes seleccionado (corte anterior excluido, actual incluido), consultando también el mes anterior. No sumar snapshots de deuda encima de los gastos. Otros métodos, tarjetas sin corte e ingresos de transacciones usan mes calendario. Las cuotas mantienen su calendario de cortes, los recurrentes su mes asignado y los pagos parciales el descuento del remanente trasladado. El día de pago no desplaza el mes del balance.
- `prefetch: false` en Astro; no añadir prefetch. La configuración actual de Clerk tiene `prefetchUI: true`; es una opción distinta del prefetch de navegación.
- Los scripts module de Astro se ejecutan una vez con ClientRouter. Inicializar listeners ligados a elementos reemplazados en `astro:page-load`; listeners globales sobre `document` se registran una vez. No usar `data-astro-rerun` para scripts con imports.
- Mantener el tema antes del primer paint y en `astro:after-swap`, la barra global `#nav-loading` y el respeto a `prefers-reduced-motion`.
- Sidebar desktop de ancho `w-64`; móvil como drawer con overlay. Navegación data-driven con hrefs localizados. Mantener placeholder fijo y `transition:persist="user-button"` del avatar de Clerk.

## Idiomas y textos

- Locales actuales: `es` y `en`. No añadir idiomas salvo petición. Todos llevan prefijo; `/` redirige a `/es`.
- Resolver locale SSR con `resolveLocale(Astro.currentLocale)`; props tipadas con `LocaleCode` (salvo el puente intencional `ClerkLocaleBridge`). Generar URLs con `getRelativeLocaleUrl`.
- Todo texto traducible UI vive en `es.ts` y `en.ts`; añadir ambos antes de usarlo. La identidad invariable de marca se comparte desde `site.ts`. Consumir con `t = getLocaleDict(locale)` o `useLocaleDict()`, nunca importar `es` para leer etiquetas en componentes. No añadir un `texts.ts` paralelo.
- Strings dinámicos como funciones del diccionario; strings compartidos en el objeto interno `shared`. Clases, IDs, atributos `data-*` y query params no son textos UI.
- Usar helpers de `form-fields.ts`, `filter-fields.ts` y `general-fields.ts` parametrizados con `t`; no duplicar fields ni etiquetas reutilizables inline.
- Pasar locale a `monthLabel`, `formatDate` y `formatDateTime`. El cambio de idioma conserva ruta y query string.
- Datos de sistema en inglés, minúsculas y kebab-case; datos del usuario se conservan exactamente como los escribió. Display mediante `displayCategoryName` y `displayPaymentMethodName`.

## Autenticación y secretos

- Middleware Clerk resuelve el usuario y expone `userId`, `createdAt` y `user` en locals. Sin sesión, protege las rutas app excepto login y redirige al login localizado; las landings son públicas.
- Sincronizar perfil desde Clerk solo si falta email o display_name; evitar una llamada remota en cada request.
- Localización Clerk mediante `getClerkLocalization` y `ClerkLocaleBridge`. `UserButton` usa `/es/app/login` al cerrar sesión.
- Variables declaradas con `envField` en Astro: `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `CLERK_SECRET_KEY` (servidor/secretas) y `PUBLIC_CLERK_PUBLISHABLE_KEY` (cliente/pública). No exponer secretos al cliente ni incluirlos en logs o documentación.
- Consumir secretos desde `astro:env/server` en el cliente Turso y middleware; no usar `import.meta.env` para ellos.
- Toda operación de datos debe respetar el scope por `userId`; no confiar en IDs enviados por cliente para autorizar acceso.

## Peticiones API desde cliente

- Usar exclusivamente `src/lib/ui/api-client.ts` para JSON: `apiFetch<T>` devuelve el envelope validado, `apiData<T>` devuelve `data` y `fetchList<T>` normaliza arrays simples/paginados. No usar `safeFetch` ni `fetch` directo a endpoints JSON.
- El cliente comprueba HTTP, JSON y `success`; los tipos de dominio son estáticos, no validación de sus campos en runtime. Los errores lanzan `ApiError` (`kind`, `status`, `code`, `params`); mostrar mensajes mediante `apiErrorMessage(error, t)` y `role="alert"`. Nunca convertir errores en `[]`, `false` o `undefined`.
- Los endpoints devuelven `error: ApiErrorCode` y parámetros tipados opcionales. Añadir códigos en `types/api.ts` y mensajes en `t.error.api` de ambos idiomas. No devolver prosa localizada ni mensajes internos de excepciones. `category-exists` usa `{ name }` sin traducir el nombre del usuario; códigos desconocidos muestran un respaldo localizado. Factories usan `notFoundCode` y `validateCreate` devuelve `ApiErrorCode | null`.
- Pasar `AbortSignal` en consultas reemplazables, cancelarlas al cambiar filtros/desmontar y descartar resultados obsoletos. Mantener los datos anteriores ante fallos y limpiar el error al recuperarse. Las cancelaciones no se muestran como errores.
- No reintentar mutaciones automáticamente. Distinguir guardado fallido de guardado exitoso cuyo refetch falló (`t.error.refreshData`). La moneda solo se actualiza localmente tras confirmar el guardado.
- Los pagos parciales registran primero el pago y después el cargo del saldo restante. `CarryoverError` indica que el primer paso sí terminó: informar el fallo del segundo sin ofrecer repetir el pago desde el mismo diálogo. El cálculo de tarjetas persiste snapshots; consultar las deudas después de terminar los cálculos.
- Excepción: `src/lib/ui/data-refresh.ts` usa `fetch` para fragmentos HTML SSR; no pasa por el cliente JSON.
## Base de datos y API

- Esquema modular e idempotente en `db/schemas/*.sql`. Semilla existente en `db/seed.js`.
- Cada cambio de esquema actualiza el SQL final correspondiente en `db/schemas/` y entrega el SQL de migración de producción directamente en el chat para que el usuario lo ejecute, sin crear archivos de migración ni otros archivos separados para entregarlo.
- Usar `getDb()` de `src/lib/server/db/client.ts`, `db.execute({ sql, args })` y binds `?`; args tipados `(string | number | boolean | null)[]`. Mantener `nextSeq` existente.
- Cashback no tiene columna `updated_at`: tanto `insertRow` como `applyUpdate` deben recibir `withUpdatedAt: false` en su repositorio.
- Reutilizar `createIdRoutes` y `createIndexRoutes` de `src/lib/server/api-routes.ts` cuando aplique. Rutas custom también usan `withErrorHandling` y `readJsonBody` de `api-helpers.ts`.
- Reutilizar helpers de autenticación, respuestas JSON, paginación, booleanos y rangos de fechas. JSON inválido devuelve 400; errores inesperados se registran y devuelven JSON 500.
- Mantener duplicate-check de categorías (409), snapshots mensuales de recurrentes y sincronización tarjeta/método de pago al crear, actualizar o borrar.
- Compras: artículos pertenecen a listas (`list_id`); finalizar completa sus artículos y borrar una lista elimina sus artículos. Nombre opcional con fecha/hora localizada como fallback visual.
- Pagos parciales: `statement_balance` es saldo bruto; `paid_amount` guarda el pago. Resumen e historial de Tarjetas muestran el adeudo bruto del mes, lo pagado y el saldo no pagado (`max(0, statement_balance - paid_amount)`), incluso después de cerrar el mes. El saldo no pagado es informativo, no deuda pendiente adicional: un mes con `is_paid` mantiene neto pendiente 0; el remanente se registra en el mes siguiente mediante `CARRYOVER_DESCRIPTION_PREFIX`. Evitar contar la misma deuda dos veces y no inferir de `is_paid` que se pagó todo el adeudo.
- Plazos: `start_date` es la fecha de compra. En crédito, la primera cuota corresponde al primer corte que incluye esa fecha (compra el día de corte incluida); las siguientes corresponden a meses de corte consecutivos. El día de pago no desplaza el mes del estado de cuenta: corte/pago 7/7 implica pago el mes siguiente. Sin corte de crédito, la primera cuota corresponde al mes de compra. Compartir `installmentFirstMonth`, `installmentRemaining` e `isInstallmentInMonth` de `date.ts` entre Plazos, Tarjetas y Dashboard. La última cuota permanece visible durante su mes con `0/total`; desaparece al siguiente. Las lecturas calculan `remaining_months` al cierre del mes seleccionado (mes actual si no hay filtro) sin escribir en BD; es progreso del calendario, no confirmación de pagos. El campo almacenado no determina la vigencia. `cardStatementPeriod` excluye el corte anterior e incluye el actual, ajustando cortes 29–31 a meses cortos sin solapar periodos.

## UI, formularios y accesibilidad

- Solo la landing incluye «Apóyame» en el Header: `SupportPopover.astro` usa Popover API nativa en escritorio (capa superior, Escape y clic fuera) y un panel `details`/`summary` dentro del menú móvil, sin depender de Popover API ni de posicionamiento flotante en celular. Ambas variantes comparten `SupportLinks.astro`, con enlaces desde `SITE_LINKS` y textos es/en. `support-popover.ts` posiciona y gestiona el popup de escritorio; `landing-menu.ts` cierra el panel móvil al cerrar el menú o elegir un enlace. No añadirlo al shell de la app.

- Tarjetas: en Resumen, los meses pagados a tiempo usan borde `border-info` y etiqueta `bg-info-bg text-info-text`; los pagos tardíos conservan el indicador `danger`. Historial usa `info` para la etiqueta de pagado. Reutilizar las variantes claro/oscuro existentes; los bordes de meses pendientes siguen indicando proximidad del vencimiento.

- **Coherencia de UI entre secciones de la app**: mantener un diseño y comportamiento homogéneos en títulos, botones, filtros, tabs, tablas, tarjetas, formularios, modales y estados de carga, error y vacío. Reutilizar componentes, tokens y patrones existentes para conservar tamaños, espaciados, tipografía, colores, ubicación de acciones y comportamiento responsive. Antes de añadir o modificar una interfaz, revisar las secciones equivalentes y seguir sus convenciones; cualquier diferencia debe responder a una necesidad funcional concreta.
- `CrudModal` compone `CrudField.tsx` (render de campos), `useCrudModal.ts` (carga y guardado) y `crud-form.ts` (defaults, visibilidad y payload). Los tipos viven en `src/lib/types/crud.ts`: `Field` es una unión discriminada, exige opciones para selects y limita `step`/`min` a números. Tipar los arrays de campos antes de serializarlos en SSR.
- La carga de edición muestra estado y errores dentro del modal, cancela peticiones al cerrar/cambiar registro y bloquea guardar hasta cargar los datos. Los números se convierten al enviar con `Number`, validan finitud y mínimo; vacío opcional es `null`, vacío obligatorio es error. Nunca convertir una entrada inválida en cero.

- Reutilizar `Select`, `MultiSelect`, `TabBar`, `TabBarWithMonth`, `MonthSelector`, `PageHeader`, `DataTable`, `CrudModal`, `FormModal`, `ConfirmDelete`, `DeleteHandler` y `ToggleHandler`.
- Estilizar el campo y el desplegable de los `<select>` y los `<input list>` con `<datalist>` usados en búsquedas o filtros. Aplicar los tokens del proyecto a la tipografía, el espaciado, el contraste y los estados de foco y selección. Preferir el control nativo cuando permita aplicar ese diseño en los navegadores objetivo. Para `<select>`, comprobar el soporte de `appearance: base-select` y `::picker(select)` antes de usarlos.
- Si el control nativo no permite estilizar el desplegable como requiere el diseño, crear o reutilizar un componente accesible. Para autocompletar una selección única mientras se escribe, usar un [combobox editable](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). Mantener el contrato del campo, incluido si admite texto libre o exige una opción de la lista. Verificar etiqueta accesible, foco visible, navegación y selección con teclado, cierre con Escape y uso con lector de pantalla y en móvil.
- Usar selección única por defecto. Habilitar la selección múltiple cuando se solicite, con `<select multiple>` si cumple el diseño y la interacción o con una [lista de selección múltiple accesible](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/). Si se necesitan ambos modos en un componente personalizado, reutilizar el mismo componente con un modo configurable.
- Mantener `Select` para el filtro de mes y `MultiSelect` en los filtros existentes de selección múltiple. En esos filtros, tener seleccionadas todas las opciones equivale a no restringir los resultados.
- Cuando se solicite «Seleccionar todo», añadir una acción accesible separada de las opciones. Indicar si abarca los resultados filtrados o la lista completa y aplicarla solo a las opciones habilitadas dentro de ese alcance.
- Orden de formulario: fecha → tipo → descripción → montos → moneda → método de pago/tarjeta → categoría → específicos. Usar helpers de campos.
- `required: true` muestra asterisco rojo y debe corresponder a `NOT NULL`. Decimales como raw string hasta submit; color picker de ancho completo, sin reset.
- Labels e inputs con `htmlFor`/`id`. Modales con `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape y autofocus. `DataTable` requiere `ariaLabel`.
- Disparadores CRUD: `data-create="module"`, `data-edit-{module}="id"`. CTA móvil junto al título, a la derecha.
- No usar `alert()`, `confirm()` ni `prompt()` nativos; errores inline con `role="alert"` y borrado mediante `ConfirmDelete`.
- Tabs con botones, roles APG, `aria-selected`, `aria-controls`, roving tabIndex y teclas ←/→/Home/End; paneles asociados. En móvil, tabs como Select junto al filtro de mes.
- Mantener `focus-visible`, contraste, aria-labels traducidos y `aria-hidden` en iconos decorativos. Renderizar los desplegables personalizados en un portal y adaptarlos al viewport.
- Usar tokens existentes de `global.css` (surface, panel, border, string, primary, success, danger, warning, info y variantes), con soporte claro/oscuro.
- En móvil, filtros de dos en dos, último impar a ancho completo; search y Limpiar al final en líneas propias. Cards de dos en dos, última impar ocupa ambas columnas.

## Filtros, tabs y estado en URL

- **Meses permitidos**: validar `month` y `summary_month` con `isAvailableMonth` de `date.ts`, que usa exactamente `getMonthOptions(12, createdAt)`. No aceptar un mes solo por cumplir `YYYY-MM`. El middleware sustituye meses no disponibles de URLs GET de la app mediante redirect 303 con valores predeterminados explícitos (`summary_month=mes actual`, `month=`), conservando los demás filtros; no eliminar simplemente las claves en redirects 302 porque Netlify puede reenviar el query original y provocar un bucle. En solicitudes válidas se omiten los valores predeterminados como siempre. El middleware responde JSON 400 en GET de la API antes de consultar datos; revisa también parámetros repetidos. `useFilteredData` recibe `createdAt`, normaliza meses de URL y rechaza selecciones fuera del rango. `TabBarWithMonth` valida cambios y restaura el selector en `popstate`. Mantener vacíos como opción predeterminada cuando corresponda.
- Cada consumidor de `useFilteredData` declara `keys`, `locale` y defaults opcionales (tipos en `src/lib/types/filters.ts`). El hook restaura y modifica solo sus params, elimina los retirados y conserva params ajenos, hash e `history.state`; los defaults no se escriben en URL. Plazos usa Activo por defecto (`active_only=true`, omitido en URL), Inactivo (`active_only=inactive`) y Ambos (`active_only=false`). El API convierte Inactivo a `inactive_only` del filtro de dominio. El estado compara el último mes de corte con el mes seleccionado o actual: la última cuota sigue activa con `0/x`; pasa a inactiva el mes siguiente. Con mes concreto, Ambos incluye los plazos iniciados hasta ese mes; `findSummaryByMonth` solicita solo los vigentes.
- El hook valida HTTP y el envelope `{ success, data, error }`, cancela peticiones anteriores y descarta respuestas obsoletas, limpia errores al recuperarse y respeta datos iniciales SSR. `searchValue` controla la búsqueda con debounce de 300 ms y limpieza al desmontar; `popstate` restaura filtros y búsqueda.

- URL como fuente de verdad: restaurar filtros, search, tab y página desde query params. Predeterminados no agregan params; al volver al default eliminarlos.
- Cambios de filtros/tabs actualizan UI y URL con history, sin recarga. Combinar filtros con AND y preservar params ajenos. Tab mediante `?tab=`, adoptando hashes legacy solo por compatibilidad.
- `useFilteredData` para componentes `*Filterable`; mostrar su `error` en banner `role="alert"`. Transacciones y administración de Plazos paginan a 50 con `Pagination.tsx`; cambiar/limpiar filtros vuelve a página 1. Sus APIs devuelven `{ data, total, page, pageSize }`. Plazos usa `findPaginated`; resumen y dashboard conservan arrays sin paginar. Si un borrado deja la página fuera de rango, corregirla también al recibir datos SSR.
- `TabBarWithMonth` emite `monthchange` con `detail: { month }`; recurrentes y tarjetas lo escuchan y refetchean. Fuera de history, no permitir la opción de todos los meses.
- Plazos reutiliza `TabBarWithMonth` con `monthTabs={["summary"]}` y `monthParam="summary_month"`: selector solo en resumen, mes actual por defecto y filtros de administración independientes. `InstallmentsSummary` recibe datos SSR y consulta `/api/installments/summary?month=YYYY-MM` al cambiar el mes, con cancelación y errores visibles; al hidratar comprueba también la URL para recuperar cambios realizados antes de registrar sus listeners. `findSummaryByMonth` incluye los plazos cuya vigencia coincide con el mes y calcula cuotas restantes al cierre de ese mes sin modificar la BD.
- Resúmenes usan mes actual por defecto; registros/historial usan últimos 12 meses. Generar opciones desde el alta, máximo últimos 12 meses, más mes siguiente. Reutilizar `lastYearWindow` y helpers de fecha en SSR/API. En Plazos, los rangos de fechas seleccionan calendarios de cuotas que coinciden con la ventana y se combinan con el filtro de estado; no filtran por antigüedad de la compra.
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

- `pnpm test` ejecuta las pruebas unitarias `tests/**/*.test.ts` con `node:test` y `node:assert/strict`. `tests/register-alias.mjs` resuelve `@/` hacia `src/` solo durante las pruebas. Las suites cubren cortes, vencimientos, plazos y meses disponibles con fechas controladas y sin servicios externos.
- Revisar archivos afectados y diff, respetando cambios previos del usuario. No revertir modificaciones ajenas.
- Explicar qué cambió y cualquier limitación real. Para validaciones de ejecución, dar al usuario el comando exacto y esperar su salida para corregir errores.
- No afirmar que un build, instalación, prueba CRUD o despliegue pasó si el usuario no proporcionó el resultado.
