# AGENTS.md — Open PRP

Guía de arquitectura y convenciones para agentes/IA que trabajen en este repo. Léela antes de generar o modificar código.

## Mantenimiento de este archivo

Cualquier cambio general, función nueva o componente importante que se agregue al proyecto debe reflejarse siempre en este `AGENTS.md`.

La documentación técnica se mantiene en español como idioma principal (`README.md`, `DOCS.md`, este `AGENTS.md`); las traducciones al inglés viven en `README.en.md` y `DOCS.en.md` y se adaptan después de actualizar las fuentes en español. Al tocar documentación, actualizar primero la versión en español y luego (si aplica) la inglesa.

## Desarrollo

```bash
astro dev --background
astro dev stop | status | logs
```

- **Builds**: el **usuario** ejecuta el build (`pnpm build`) y comparte la salida. El agente **nunca** ejecuta builds ni comandos similares (node vive en fnm, fuera del PATH del shell): el usuario lo corre todo y reporta si hubo errores o si salió bien. Esto mismo aplica al guardar o editar algo desde un modal CRUD: el agente no lo prueba, el usuario lo hace y reporta el resultado.

## Stack

- **Framework**: Astro 7 (con **enrutamiento i18n** por directorio `[locale]`: `prefixDefaultLocale: true` → todos los locales con prefijo, `redirectToDefaultLocale: true` → `/` redirige a `/es`, `fallbackType: "redirect"`).
- **UI interactiva**: React 19 (solo donde se necesite interactividad en cliente, directiva `client:load`)
- **Estilos**: Tailwind 4
- **Lenguaje**: TypeScript (sintaxis moderna, sin JavaScript plano)
- **i18n**: diccionarios bilingües `es`/`en` (ver sección [Textos UI centralizados](#textos-ui-centralizados-i18n))

## Infraestructura

- **Hosting**: Netlify (adapter en `astro.config.mjs`)
- **Base de datos**: TursoDB (`@libsql/client/web`, compatible con Netlify Functions)
- **Autenticación**: Clerk
- **Variables de entorno**: `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Se declaran con el schema de `envField` de Astro en `astro.config.mjs` (`env.schema`), con `context` (`server`/`client`) y `access` (`secret`/`public`). Ventajas: valida en build que existan las obligatorias (`optional: false`), da tipos e IntelliSense para `import.meta.env.*`, y evita fugas al cliente (solo las `PUBLIC_*` con `access: 'public'` llegan al bundle del cliente; los secretos nunca se exponen).

## Arquitectura general

- **SSR-first**: se prioriza Server-Side Rendering con Astro. Los datos se obtienen en SSR siempre que sea posible; la página llega ya renderizada al cliente.
- **Prefetch deshabilitado**: `prefetch: false` en `astro.config.mjs`. El `<ClientRouter />` de Astro activa por defecto `init({ prefetchAll: true })` (inyecta `<link rel="prefetch">` en hover, duplicando el fetch SSR por navegación); se desactiva explícitamente para evitarlo. No usar prefetch.
- **Mejores prácticas y rendimiento**: seguir siempre las mejores prácticas de cada tecnología (Astro, React, Tailwind, TypeScript, Clerk, TursoDB) y priorizar el rendimiento web (Core Web Vitals, bundle en cliente reducido, SSR/SSG donde aplique, queries eficientes, caching, hydration mínima).
- React 19 se usa únicamente en componentes que requieren comportamiento dinámico en cliente (filtros, tabs, modales CRUD, interacciones en lista de compras).
- Se prioriza la componentización y reutilización de componentes, utilidades y estilos. Cualquier funcionalidad compartida entre secciones debe implementarse como recurso reutilizable, nunca duplicado.
- **Patrón de datos iniciales SSR**: las islas React reciben datos del primer render vía props (`initialData={JSON.stringify(...)}` desde repositorios en el frontmatter de la `.astro`). Re-fetch en cliente al cambiar filtros (vía `useFilteredData` o escuchando el evento `monthchange`) o tras una mutación. Aplica a: `ShoppingList`, `RecurringPaymentsMonthly`, `RecurringPaymentsHistory`, `CreditCardSummary`, `CardsHistory`, `CurrencySelect`, componentes `*Filterable`.
- **Rendimiento SSR**: las queries de repositorio independientes del frontmatter se ejecutan siempre con `Promise.all` (nunca en serie con `await` secuenciales), porque cada `execute` contra Turso es un round-trip HTTP y en serie suman la latencia (2s+). El middleware inyecta `Astro.locals.user` (fila completa del usuario ya consultada en `findOrCreate`) para que componentes como el Sidebar lean `preferred_currency` de ahí y no hagan una query extra por página.
- `src/lib/dashboard/load.ts` → `loadDashboardMonth()`: mismas queries que la API pero vía repositorios (sin HTTP), usado directamente en `dashboard.astro`. No recalcula deudas ni hace `upsert` de `card_monthly` por visita (eso ocurre bajo demanda desde el cliente vía `/api/card-monthly/calculate` y desde la página de tarjetas).
- `src/lib/dashboard/api.ts` → fetch de datos + mutaciones del dashboard desde cliente.

## Cambio de filtros sin recarga

- Las páginas de **tarjetas** y **pagos recurrentes** usan `TabBarWithMonth` que dispatchea un evento `monthchange` en `window` al cambiar el mes. Los componentes (`RecurringPaymentsMonthly`, `RecurringPaymentsHistory`, `CreditCardSummary`, `CardsHistory`) escuchan ese evento y refetchean datos desde los endpoints API sin recargar la página. La URL se actualiza vía `history.replaceState`.
- Los componentes `*Filterable` (transacciones, plazos, cashback, despensa) usan el hook `useFilteredData` que maneja filtros, fetch y URL de forma autónoma. El estado inicial de filtros se restaura desde los query params de la URL (la URL es la fuente de verdad; excluye `tab`, gestionado por `TabBar`), y al cambiar filtros la URL se actualiza preservando los params no gestionados por el hook. Así la UI y los filtros aplicados (SSR) siempre coinciden tras un reload (p. ej. el de `CrudModal`). El hook devuelve también `error` (string, vacío si OK) que los `*Filterable` muestran como banner `role="alert"`; nunca silenciar los errores de fetch.
- `CrudModal` y `ConfirmDelete` actualmente **recargan la página** tras guardar o eliminar (`window.location.href = window.location.href` / `window.location.reload()`). Pendiente de migrar a refetch sin recarga.

## Autenticación / Middleware

- `clerkMiddleware` desde `@clerk/astro/server` en `src/middleware.ts` (integración `@clerk/astro`).
- Rutas públicas (sin autenticación requerida): `/es`, `/en` (landing) y `/es/app/login`, `/en/app/login`. Middleware protege el resto de `/es/app/*` y `/en/app/*`.
- Sin sesión en rutas de app → redirige al login **localizado** usando `context.currentLocale` + `getRelativeLocaleUrl(locale, "/app/login")` (import de `astro:i18n`). Las URLs legacy sin prefijo (`/app/*`) redirigen a su equivalente en `/es`.
- `needsSync` — sincroniza el perfil **solo si falta email o display_name** (el check se hace en `middleware.ts` sobre el usuario devuelto por `findOrCreate`, sin query extra ni cooldown). Así se evita la llamada HTTP a la API de Clerk en cada request.
- Hooks React desde `@clerk/astro/react` (**no** `@clerk/clerk-react`).
- `UserButton` con `afterSignOutUrl="/es/app/login"` y `client:load`.
- Redirects de Clerk configurados en `astro.config.mjs`: `afterSignOutUrl`.
- **Localización de componentes de Clerk**: `@clerk/localizations` (versión alineada con `@clerk/astro`). El mapeo locale → recurso vive en `getClerkLocalization(locale)` (`src/lib/i18n/clerk-localizations.ts`): `es` → `esES`, `en` → `enUS` (default `esES` si falta la clave). Al añadir un idioma, añadir su clave al mapa.
- La integración `clerk()` en `astro.config.mjs` recibe `localization: getClerkLocalization(DEFAULT_LOCALE)` como valor por defecto (solo afecta a componentes embebidos, no al Account Portal). `ClerkLocaleBridge` (isla `client:load` en `AppLayout` y `LandingLayout`) ajusta la localización al locale de la página con `updateClerkOptions({ localization })` desde `@clerk/astro/client`; se ejecuta tras la inicialización de Clerk (garantizada por el script `before-hydration` de la integración).

## Estructura del proyecto

- **Ruteo**: `/` → redirige a `/es` (landing). `/es/app` → redirige a `/es/app/dashboard` (logueado) o `/es/app/login` (no logueado). Con i18n, todo vive bajo `[locale]`: `src/pages/[locale]/index.astro` (landing) y `src/pages/[locale]/app/*` (app). La app se sirve en `/es/app/*` y `/en/app/*`.
- **Prerender**: la landing `[locale]/index.astro` está prerenderizada (`export const prerender = true` + `getStaticPaths` con `LOCALES`); el resto de páginas son SSR. No prerenderizar páginas que dependan de auth, `Astro.locals` o la base de datos (todo `/es/app/*` y `/es/app/login`).
- **Páginas**: landing en `src/pages/[locale]/index.astro`; app en `src/pages/[locale]/app/*`; API en `src/pages/api/*/` (sin prefijo de locale).
- **Landing**: componentes en `src/components/landing/*`, layout `LandingLayout.astro`.
- **App**: componentes en `src/components/app/*`, layout `AppLayout.astro`.
- **UI compartida** (landing + app): `src/components/ui/*` (ThemeToggle, Select, MultiSelect, ErrorBoundary, LocaleSwitcher, ClerkLocaleBridge).
- **UI propia de la app**: `src/components/app/ui/` (CrudModal, DataTable, FormModal, ConfirmDelete, DeleteHandler, ToggleHandler, TabBar, TabBarWithMonth, MonthSelector, FilterSelect, FilterLinks, CurrencySelect, PageHeader, Sidebar).
- **Módulos** (`src/lib/modules/`): `transactions`, `card-monthly`, `cards`, `cashback`, `events`, `installments`, `notes`, `pantry`, `payment-methods`, `recurring-payments`, `recurring-payment-monthly`, `shopping`, `tasks`, `users`.
- **Tipos**: `src/lib/types/` — un archivo por dominio. Nunca tipos inline.
- **Traducción/homologación de textos** (`src/lib/i18n/`): `es.ts` (diccionario es + tipo `Locale`) y `en.ts` (diccionario en), `locale.ts` (`LOCALES`, `LocaleCode`, `getLocaleDict`), `LocaleProvider.tsx` (`LocaleContext`, `useLocaleDict`), `category-labels.ts` y `payment-method-labels.ts` (nombres de sistema → display), `clerk-localizations.ts` (mapeo locale → recurso de `@clerk/localizations`), `form-fields.ts`, `filter-fields.ts` y `general-fields.ts` (helpers/constantes de campos, filtros y botones, parametrizados con `t`).
- **Lógica browser** (`src/lib/ui/`): `theme.ts`, `currency.ts`, `sidebar.ts`, `useFilteredData.ts`.
- **Componentes React**: siempre directiva `client:load`.
- **Imports**: alias `@/` con **extensión explícita** (`.ts`, `.tsx`, `.astro`, `.svg`).
- Astro para estilos usa `class`; React usa `className`.

### Assets

- SVGs en `src/assets/*.svg` (kebab-case), importados vía `@/assets/*` con `vite-plugin-svgr`. Identificador PascalCase + sufijo `Icon`.
- En `.tsx` usar sufijo `?react` para obtener el componente React.

### Layouts

- `BaseLayout.astro` — `<html>`, `<head>`, meta, favicon, `ClientRouter` (View Transitions), dark mode inline script, título `"Open PRP | {title}"`, `<slot name="head" />`. El script de tema aplica el tema antes del primer paint y se re-aplica en `astro:after-swap` (evita el flash blanco al navegar con view transitions).
- `AppLayout.astro` — extiende `BaseLayout`. Inyecta manifest PWA + theme-color vía `slot="head"`. Sidebar + main + pantalla de login. Registra el service worker.
- `LandingLayout.astro` — extiende `BaseLayout`. Header + slot + Footer.
- Todo layout específico (ej. `BlogLayout.astro`) debe envolverse en `BaseLayout.astro`, reenviando como mínimo la prop `title` (y otras si aplica) para que `BaseLayout` controle el `<head>` y el título de la página.

```astro
---
// BlogLayout.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
const { title } = Astro.props;
---
<BaseLayout title={title}>
  <slot />
</BaseLayout>
```

- No dupliques lógica de `<head>`/SEO en el layout hijo: eso vive solo en `BaseLayout.astro`.

- El título `title=` de las páginas debe ser el nombre de la sección/página (ej. **Dashboard**), y se renderizará como `Open PRP | Dashboard`. Si no se pasa `title=`, se muestra solo `Open PRP` ya que se tiene realizado la siguiente configuracion en `BaseLayout.astro`

```astro
const { title } = Astro.props;
const pageTitle = title ? `Open PRP | ${title}` : "Open PRP";
```

### Sidebar (app)

- Fija `w-64` en desktop; oculta en móvil (drawer con overlay + backdrop).
- Navegación data-driven: `APP_LINKS` (grupos `{ title?, links: [{ href, label, icon }] }`), estado activo vía `currentPath.startsWith(href)`. Los hrefs se generan con `getRelativeLocaleUrl(locale, path)` para conservar el prefijo de idioma.
- Footer: ícono GitHub, `LocaleSwitcher`, `ThemeToggle`, `CurrencySelect` (moneda vía `UserRepository` en SSR), `UserButton` (`@clerk/astro/components`) + "Mi cuenta".
  - `UserButton` envuelto en caja fija `h-8 w-8 rounded-full bg-surface-alt` (placeholder) + `appearance.userButtonAvatarBox` de 2rem: ClerkJS monta el avatar de forma asíncrona (CDN); sin la caja, el footer crece tarde y salta el layout.
  - La caja del avatar lleva `transition:persist="user-button"`: al navegar con view transitions, Astro conserva el elemento montado de Clerk (su React root) en lugar de recrearlo, evitando que el `UserButton` desaparezca y reaparezca en cada navegación (la integración de Clerk delega el swap en `swapBodyElement` de Astro, que respeta `data-astro-transition-persist`). El label "Mi cuenta" queda fuera de la caja persistida para que se traduzca al cambiar de idioma.
- **View transitions**: los scripts module bundled de Astro se ejecutan **solo una vez** y se ignoran en navegaciones posteriores del ClientRouter (se marcan `data-astro-exec`). Por eso `initSidebar()` (binding a elementos del DOM, que se reemplazan en cada swap) se registra dentro de `document.addEventListener("astro:page-load", ...)` en el script de `AppLayout.astro` (`astro:page-load` se dispara en la carga inicial y en cada navegación). En cambio `initUserAreaForward()` (listener a nivel `document`, que persiste) y el registro del service worker corren una sola vez fuera del listener. No usar `data-astro-rerun`: fuerza `is:inline` (rompe imports) y acumula listeners.

## TypeScript

- **Sin `any`**. Args de bind: `(string | number | boolean | null)[]`.
- `catch { }` o `catch (e: unknown)` + log.
- `CategoryType`: `"global" | "personal"`.
- `PaymentMethodType`: `"global" | "personal" | "card"`.
- Sin `scope` ni `family_id`.

## Convención de datos: valores de sistema vs datos de usuario

- **Datos globales/predefinidos por el sistema** se guardan en la base de datos **en inglés, en minúsculas**, con guiones medios en vez de espacios (ej. `installments`, `expense`, `card-balance`, `salary`).
- **Datos ingresados por el usuario** se guardan exactamente como fueron escritos, respetando idioma, formato y estilo original. Nunca se normalizan ni traducen.
- La aplicación separa el **valor almacenado** de su **representación visual** mediante `displayCategoryName(cat, t)` en `src/lib/i18n/category-labels.ts` (categorías) y `displayPaymentMethodName(pm, t)` en `src/lib/i18n/payment-method-labels.ts` (métodos de pago globales: `payroll`, `transfer`, `cash`). Ambos reciben el diccionario `t` para resolver el display según el idioma.

## Textos UI centralizados (`src/lib/i18n/`)

- **Todos los textos UI** (títulos de página/sección, botones, placeholders, aria-labels, textos de tablas, mensajes vacíos, CTAs, badges, textos de filtros, mensajes de error/confirmación) viven en el diccionario del locale, un objeto `as const` organizado por dominio (`common`, `field`, `table`, `empty`, `badge`, `stat`, `tabs`, `nav`, `theme`, `page`, `cta`, `singular`, `filter`, `currency`, `shopping`, `cards`, `recurring`, `dashboard`, `sections`, `select`, `error`). Estructura label-value preparada para i18n (**no implementar más idiomas todavía**).
- **Estructura i18n**: un archivo por idioma (`src/lib/i18n/es.ts` con `export const es`). Al añadir un idioma, se crea su archivo (`en.ts`, etc.) y los consumidores importan directamente el locale correspondiente desde su archivo — **no usar barrels ni `index.ts`** (ver convención de imports). `es.ts` define el tipo `Locale = typeof es`; `en.ts` es `export const en: Locale = {...}`. `locale.ts` exporta `LOCALES` (`["es", "en"]`), `LocaleCode` y `getLocaleDict(code)`.
- **Consumir siempre con `t`** — nunca importar `es` para leer textos:
  - SSR/páginas: `const locale = Astro.currentLocale ?? "es"; const t = getLocaleDict(locale);` y usar `t.*`.
  - Islas React: reciben `locale` por prop (patrón de datos iniciales SSR) y resuelven con `getLocaleDict(locale)`, o usan el contexto `useLocaleDict()` dentro de un `<LocaleProvider locale={locale}>`.
- **Nunca hardcodear textos UI inline** en componentes ni páginas: importar el helper parametrizado con `t` o acceder a `t.*`. Solo texto visible/al usuario va a labels; los datos del usuario (nombres, descripciones) nunca.
- **Strings dinámicos** se modelan como funciones dentro del diccionario (template literals): ej. `t.common.deleteConfirm(label)`, `t.common.deleteTitle(label)`, `t.common.editSingular(s)`, `t.common.newSingular(s)`, `t.shopping.toBuy(n)`, `t.shopping.bought(n)`, `t.dashboard.dueInDays(n)`, `t.dashboard.overdueCount(n)`, `t.error.message(msg)`, `t.select.countSections(n)`.
- `src/lib/i18n/general-fields.ts` y `src/lib/i18n/filter-fields.ts` exponen **funciones** que reciben `t` (`BTN_EDIT(t)`, `FILTER_ALL_MONTHS(t)`, `FILTER_SEARCH_DESC(t)`, `BTN_CLEAR(t)`, etc.); las constantes puramente CSS (clases) se mantienen estáticas (`FILTER_WRAP_CLASS`, `INPUT_CLASS`, `COLOR_CLASS`, `CURRENCY_SYMBOL`). Para esos textos importar la función desde su archivo, no acceder a `t` directamente ni importar `es`.
- `src/lib/i18n/form-fields.ts` también se parametriza con `t`: `fieldType(t)`, `fieldTypeCurrency(t)`, `paymentMethodField(t, pms)`, `categoryField(t, cats)`, `cardField(t, cards)`, `dateField(t, name?)`, más `CURRENCY_OPTIONS`, `TYPE_OPTIONS`, `INPUT_CLASS`, `COLOR_CLASS`.
- **Cadenas compartidas**: los valores repetidos entre secciones viven una sola vez en un diccionario interno `shared` (no exportado) al inicio del archivo; cada sección conserva su propia clave apuntando a él (`field.category: shared.category`, `filter.allCategories: shared.allCategories`). Así las secciones quedan independientes (pueden divergir creando una clave `shared` distinta) sin duplicar el string. `shared` tiene claves separadas para singular/plural/título (`category`/`categories`, `card`/`cards`, `paymentMethod`/`paymentMethods`, `start`/`home`) y para valores con texto canónico distinto (`allCategories: "Todas las categorías"`).
- Clases CSS, atributos `data-*`, IDs, query params y emojis decorativos no van en labels.
- Cualquier texto nuevo debe añadirse al diccionario **de ambos idiomas** (`es.ts` y `en.ts`, en la sección correspondiente) antes de usarse.
- **Cambio de idioma**: `LocaleSwitcher.tsx` (isla React `client:load`, usada en `Sidebar` y `Header` de la landing) usa el `Select` custom y navega a `/{locale}{basePath}` conservando el query string.
- **Fechas y meses localizados**: los helpers de `src/lib/date.ts` (`monthLabel`, `formatDate`, `formatDateTime`) reciben el `locale` y nunca lo hardcodean; pasarlo siempre en las llamadas (`monthLabel(m, locale)`, `formatDate(d, locale)`). El `<html lang>` en `BaseLayout.astro` usa `Astro.currentLocale`.

## Base de datos

### Schema (`db/schemas/*.sql`)

- 14 archivos modulares, con prefijo numérico, idempotentes (`CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`).
- Semilla: `db/seed.js` (ESM, sintaxis moderna; se ejecuta con la última versión de Node).
- **Cambios en producción**: entregar al usuario el SQL de migración (`ALTER TABLE`, `CREATE INDEX`) a ejecutar, **y además** actualizar el `.sql` correspondiente en `db/schemas/` reflejando el esquema final.

### Repositorios

- `src/lib/modules/*/repository.ts` usa `getDb()` de `@libsql/client/web`. Queries con `db.execute({ sql, args })` y bind params `?`.
- `nextSeq("table")` — `COALESCE(MAX(seq), 0) + 1`.
- Categories: `create()` verifica duplicado por nombre (la API responde 409) — manejado vía API routes, no hay repositorio separado de categorías.
- Recurring Payments: `upsertMonthly()` hace snapshot de `category_id` y `payment_method_id`.
- `findAll()` en recurring-payments: `LEFT JOIN` con categories y payment_methods.
- Card repository: al crear/actualizar/eliminar una tarjeta, sincroniza automáticamente el `PaymentMethod` asociado vía `PaymentMethodRepository`.
- Shopping: `ShoppingRepository` (artículos, en `src/lib/modules/shopping/repository.ts`) y `ShoppingListRepository` (listas, en `src/lib/modules/shopping/lists.ts`). Los artículos pertenecen a una lista (`list_id`); `ShoppingListRepository.complete()` finaliza una lista y completa todos sus artículos, y `delete()` borra la lista junto con sus artículos. El nombre de lista es opcional (null) y la UI muestra como default la fecha+hora local de creación.

### API routes (factories)

- **`src/lib/api-routes.ts`** centraliza el esqueleto de los CRUD de la API:
  - `createIdRoutes(repo, { get?, patch?, put?, delete?, notFoundMessage? })` → handlers `GET`/`PATCH`/`PUT`/`DELETE` para `/api/*/[id]`. `repo` debe exponer `findById`/`update`/`delete` (con scope por `userId`). Variantes: `{ get: false }` (payment-methods, categories), `{ patch: false }` (pantry), `{ patch: false, notFoundMessage: "No encontrado" }` (recurring-payments).
  - `createIndexRoutes(repo, { buildFilter?, validateCreate? })` → handlers `GET`/`POST` para `/api/*/`. `buildFilter(params, context)` construye el filtro del repo; `validateCreate(body)` devuelve `string | null` (mensaje de error o `null`). Si no hay `buildFilter`, el GET llama `findAll(uid)` sin filtro (payment-methods, recurring-payments, cards).
  - Uso: `export const { GET, PATCH, PUT, DELETE } = createIdRoutes(new XRepository())`. Astro resuelve los handlers leyendo `mod[method]`, así que los exports destructurados son válidos.
  - Todos los handlers de factory están envueltos en `withErrorHandling` y leen el body con `readJsonBody` (body inválido → `400 "Body inválido"`). El body se pasa al repo con cast `as unknown as U`/`C` (los inputs de los repos están tipados).
- **`src/lib/api-helpers.ts`** — helpers compartidos de rutas: `jsonResponse`, `errorResponse`, `requireUserId`, `getSearchParams`, `parsePageParams`, **`parseBoolParam`** (parsea `?x=true|false` → `boolean | undefined`) y **`getDateRange`** (aplica la ventana "Último año" vía `lastYearWindow`/`lastDayOfMonth` cuando no hay `month` ni `date_from`/`date_to`; usada en transactions, installments, cashback). Además: **`withErrorHandling(handler)`** (envuelve un `APIRoute` para que cualquier throw devuelva JSON `500 "Error interno del servidor"` con `console.error` en vez del HTML 500 de Astro) y **`readJsonBody(context)`** (parsea el body como objeto; devuelve `Record<string, unknown> | null` si malformed/array/primitive).
- **Rutas custom (no usan factory)**: `categories/index.ts` (dup-check 409 + merge de secciones), `pantry/index.ts` (default `category_id` + try/catch con 500), `recurring-payment-monthly/index.ts` (by month, PATCH/DELETE por query param), `card-monthly/index.ts` (upsert/toggle), `notes/tags/*` y `pantry/categories/*` (repo/métodos custom). Todas envueltas en `withErrorHandling` + `readJsonBody` igual que la factory.

## Componentes UI reutilizables

- **Select**: usar el custom `src/components/ui/Select.tsx` (filtros y formularios). Dropdown portaleado a `body` con `position: fixed`, viewport-aware (`maxHeight` dinámico). Props `ariaLabel`, `aria-activedescendant`, `role="combobox"`. `fitWidest` fija el ancho del botón a la opción más larga (mide las opciones con un contenedor oculto + ResizeObserver), evitando que el ancho cambie al cambiar de opción (usado por `ThemeToggle`).
- **MultiSelect**: usar el custom `src/components/ui/MultiSelect.tsx`. Mismo patrón de dropdown portaleado y accesibilidad que `Select`.
- **Tabs**: usar `src/components/app/ui/TabBar.tsx` (no confundir con `src/components/ui/`). Mismo estilo y comportamiento en todas las secciones; en móvil se convierten en un Select custom. Recibe opcionalmente un `monthSelector` para mostrar junto a las tabs.
- **TabBarWithMonth**: wrapper de `TabBar` que añade `MonthSelector` y dispatchea el evento `monthchange` al cambiar el filtro. Props: `tabs`, `initialTab`, `defaultTab`, `ariaLabel`, `initialMonth`, `createdAt`, `allLabel`. Cuando la tab activa no es `"history"`, oculta la opción "allLabel" y si estaba seleccionada fuerza al mes actual.
- **CrudModal**: modal CRUD genérico. Se dispara con `data-create="module"` y `data-edit-{module}="id"`. Campos `required: true` muestran `*` rojo. Decimal: raw string en `onChange`, se convierte a número en `handleSubmit`. Color picker: `w-full`, sin botón reset. `htmlFor`/`id` en todos los labels/inputs. **Actualmente recarga la página tras guardar** (usa `window.location.href = window.location.href`).
- **FormModal**: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, handler de Escape, autofocus.
- **DataTable**: siempre con prop `ariaLabel` (`.astro`).
- **ConfirmDelete** (vía `DeleteHandler.astro`): confirmación de borrado sin `confirm()` nativo. **Actualmente recarga la página tras eliminar** (usa `window.location.reload()`).
- **ToggleHandler.astro**: wrapper para `ConfirmDelete` específico para toggles (activo/inactivo).
- **FilterSelect**: componente que envuelve `Select` para navegar a un href con el filtro seleccionado (usa `location.href`).
- **PageHeader**: título de sección + botón CTA (`data-create="module"`) opcional con prop `mobileOnlyCTA`.

### Reglas de uso Select vs MultiSelect en filtros

- Filtro de mes → siempre `Select` custom (nunca MultiSelect).
- Cualquier otro filtro con conjunto de opciones → `MultiSelect` custom.
- Si se seleccionan todas las opciones de un MultiSelect, se muestran todos los registros (sin restricción).

## Formularios

- Usar siempre helpers de campo (`src/lib/i18n/form-fields.ts`: `CURRENCY_OPTIONS`, `TYPE_OPTIONS`, `paymentMethodField(t, pms)`, `categoryField(t, cats)`, `cardField(t, cards)`, `dateField(t, name?)`), nunca fields inline.
- **Textos de filtros centralizados**: todas las etiquetas/placeholders reutilizables de filtros viven en `src/lib/i18n/filter-fields.ts` (`FILTER_ALL`, `FILTER_ALL_*` para opciones "todos", `FILTER_SEARCH_*` para placeholders de búsqueda, `FILTER_LABEL_*` para placeholders/ariaLabels de selects, `FILTER_SELECT_FALLBACK`, `FILTER_MULTI_SELECT_FALLBACK`, `BTN_CLEAR`). Nunca hardcodear estos textos inline en componentes: importar siempre la función y llamarla con `t` (ej. `FILTER_ALL_CATEGORIES(t)` = "Todas las categorías", `FILTER_ALL_MONTHS(t)` = "Último año", `FILTER_ALL(t)` = "Todas", `FILTER_SEARCH_DESC(t)` = "Buscar por descripción...", `FILTER_LABEL_PAYMENT_METHOD(t)` = "Método de pago").
- Orden estándar de campos: **Fecha → Tipo → Descripción → Montos → Moneda → Método pago/Tarjeta → Categoría → Específicos**.
- `required: true` en el campo → `NOT NULL` en el schema SQL (mantener auditado y sincronizado).
- Campos `required: true` muestran asterisco rojo `*`.
- Campos decimales: manejar como raw string en `onChange`, convertir a número recién en `handleSubmit`.
- Color picker: `w-full`, sin botón de reset.
- Todo label/input debe llevar `htmlFor`/`id` correspondiente.
- CRUD vía modal genérico, disparado con `data-create="module"` y `data-edit-{module}="id"` (sintaxis con `=`, no con guiones).
- Botón CTA que abre el modal: `PageHeader` con `createLabel` y `createModule`, o inline en la página para secciones sin `PageHeader`. En móvil, el CTA se alinea con el título de la sección, quedando a la derecha.

## Filtros, tabs y estado en URL

- **La URL es la fuente de verdad.** Tab activa, filtros y search se restauran automáticamente al cargar la página a partir de los query params. Sin params → valores predeterminados.
- Al cambiar de filtro o de tab, **no hay recarga de página ni navegación**: la URL se actualiza (vía `history.pushState`/`replaceState`) y la UI se actualiza en cliente con los nuevos datos.
- Filtros en su valor predeterminado (ej. mes = mes actual en vistas de resumen o "Últimos 12 meses" en vistas de historial/registros, categorías = "todas") **no** agregan query params. Al elegir un valor específico, sí se agrega. Al volver al valor predeterminado, el param se elimina.
- Todos los filtros son interoperables: se combinan con AND (ej. categoría + mes + search aplican simultáneamente).
- Tab predeterminada no agrega el param `tab` a la URL; cambiar de tab sí lo actualiza. Estado de tab siempre en query param `?tab=`, **nunca** `#hash`. Hashes viejos `#tab` se adoptan en cliente por compatibilidad.
- Al crear/actualizar vía modal CRUD, la app permanece en la misma tab; no se resetea el param de la URL. (Actualmente recarga la página, pero los params se conservan.)
- Orden de aparición de los filtros (select custom): mismo orden que en el modal CRUD → primero mes → luego orden específico → input-search → botón Limpiar (si un filtro no existe en la sección, se salta al siguiente).
- Todos los filtros (Select de mes, MultiSelect, Search, botón Limpiar) deben mantener diseño y comportamiento homogéneos en todas las secciones: mismo ancho, alto, colores de fondo, colores de texto, etc.
- **Implementación de tabs**: patrón APG con `<button>` (no anchors ni `<nav>`). `role="tablist"` + `aria-label`; tabs con `role="tab"`, `aria-selected`, `aria-controls`, roving `tabIndex` y navegación con ←/→/Home/End; paneles con `role="tabpanel"` + `aria-labelledby` + `tabindex="0"`. Implementado en `TabBar.tsx` (reutilizable) y en `ShoppingList` (duplicado).

### Filtro de mes — reglas de generación de opciones

- Antigüedad del usuario < 12 meses: se muestran los meses desde su mes de registro hasta el mes actual (nunca antes del alta), más el mes siguiente al actual.
- Antigüedad del usuario ≥ 12 meses: se muestran como máximo los últimos 12 meses, incluyendo el actual, más el mes siguiente al actual.
- Opción "Últimos 12 meses": si antigüedad ≥ 12 meses, cubre los últimos 12; si antigüedad < 12 meses, cubre desde el mes de registro hasta el actual (sin periodos previos al alta).
- **Valor por defecto según tipo de vista**:
  - **Vistas de resumen general**: por defecto el **mes actual**.
  - **Vistas de historial/registros** (con creación, edición o eliminación): por defecto **"Últimos 12 meses"**.
- **Ventana "Último año" en APIs y SSR**: sin param `month`, los endpoints (`/api/transactions`, `/api/installments`, `/api/cashback`, `/api/card-monthly/history`, `/api/recurring-payment-monthly/history`) y las páginas SSR aplican la ventana `lastYearWindow(createdAt)` de `src/lib/date.ts` (12 meses atrás o mes de registro, hasta el mes siguiente) en vez de devolver todo el histórico. Con `month` presente, filtran solo ese mes. En el SSR de `transactions.astro`, cuando aplica la ventana por defecto se añade `limit: 200` para acotar el payload inicial (el refetch del cliente vía API no está limitado).

### Evento `monthchange`

- `TabBarWithMonth` dispatchea `window.dispatchEvent(new CustomEvent("monthchange", { detail: { month } }))` al cambiar el filtro de mes.
- Componentes que escuchan: `RecurringPaymentsMonthly`, `RecurringPaymentsHistory`, `CreditCardSummary`, `CardsHistory`.
- Los componentes refetchean desde los endpoints API correspondientes cuando el mes cambia.

## Comportamiento en móvil

- Tabs → se convierten en el Select custom (mismo comportamiento que las tabs de escritorio). En móvil, tabs y filtro de mes siempre se ponen alineados en la misma línea.
- Filtros Select/MultiSelect custom → se alinean de dos en dos, saltando de línea al llenarse; si el número es impar, el último ocupa el espacio de dos.
- Input-search → penúltimo, en su propia línea.
- Botón Limpiar → último, en la línea siguiente al search.
- CTA del modal CRUD → alineado con el título de la sección, a la derecha.
- Cards (de cualquier tipo de información) → en móvil siempre se muestran dos por línea; si el número es impar, la última ocupa el espacio de ambas.
- Sidebar → oculta, se convierte en drawer con overlay + backdrop.

## Dashboard

- `DashboardHeader.tsx` — solo `MonthSelector` (sin tabs). Alineado a la derecha del título.
- Contenido del dashboard completamente SSR en `[locale]/app/dashboard.astro` (no hay islas React de contenido).
- Datos desde `src/lib/dashboard/load.ts` (server-only), `src/lib/dashboard/api.ts` (cliente, para mutaciones de pago).
- `StatCard`: props `label`, `value`, `colorClass`, `sub`.
- `FilterLinks`: props `filters: { value, label, href }[]` + `active`.
- La página de **tarjetas** no recalcula deudas en SSR: `CreditCardSummary` las fetchea bajo demanda en cliente (`/api/card-monthly/calculate`) al montar y al cambiar de mes (`monthchange`). El dashboard lee el `statement_balance` almacenado en `card_monthly`.
- **Pagas parciales de tarjeta**: `card_monthly` guarda `paid_amount` (default 0) con lo efectivamente pagado de ese mes-tarjeta. `statement_balance` es siempre el saldo bruto del periodo (lo recalcula `calculator.ts` desde transacciones); el monto pendiente real de la tarjeta es `statement_balance - paid_amount`. El pago parcial (`payCardDebtPartial` en `src/lib/dashboard/api.ts`) marca `is_paid = true`, registra `paid_amount` y crea una transacción "Saldo pendiente {mes}" por el remanente dentro del periodo del mes siguiente. El PATCH `/api/card-monthly` acepta `paid_amount` (vía `togglePaid(..., paidAmount?)`). Dashboard, `CreditCardSummary` y `CardsHistory` muestran el saldo neto `max(0, statement_balance - paid_amount)`; en `CreditCardSummary` el `committed` también descuenta `paid_amount`.

## Tema / CSS

- `ThemeToggle` con persistencia en `localStorage`, íconos como `options[].icon`.
- Tokens CSS `@theme`: `primary`, `success`, `danger`, `warning`, `info`, con variantes `-hover`, `-text`, `-bg`, `-border`.
- Colores base: `surface`, `surface-alt`, `panel`, `border`, `border-light`, `string`, `string-muted`, `nav`, `nav-hover`, `nav-active`, `nav-active-text`, `overlay`.
- `color-scheme: light` en `:root`, `color-scheme: dark` en `.dark`.

## Accesibilidad

- `:focus-visible` global, contraste mejorado en colores oscuros.
- `aria-hidden="true"` en íconos decorativos (Hero, Sidebar, Header, Select).
- `aria-label` en nav, inputs y botones sin texto visible.
- `role="dialog"`, `aria-modal`, `aria-labelledby` en modales.
- Tabs: patrón APG completo (ver sección de tabs arriba).

## Landing

- `LandingLayout.astro` → Header + slot + Footer.
- Header: hamburger menu móvil con animación, links data-driven (`LANDING_LINKS`), CTA, GitHub, `ThemeToggle`.
- Login buttons: `SignInButton`/`SignUpButton` con `asChild` + estilos Tailwind.
- `FeatureCard.astro` alimentado desde el array `FEATURES_INFO`.
- Footer: GitHub + marcvspt.tech.

## PWA

- Activa solo en `/es/app/*` y `/en/app/*`.
- `AppLayout` inyecta, vía `slot="head"`: manifest link, theme-color y meta tags correspondientes.
- Service Worker en `public/sw.js`: precachea rutas `/es/app/*`, estrategia network-first con fallback a cache. El `fetch` handler intercepta también `/en/app/*` y cachea las respuestas OK (soporte offline en ambos idiomas). `FetchEvent` usa `new URL(e.request.url)` para examinar el path.
- Manifest en `public/manifest.webmanifest`: `scope: "/"` (para cubrir `/es/app/*` y `/en/app/*`), `start_url: "/es/app/dashboard"`, `display: standalone`.

## Despliegue

- Netlify adapter en `astro.config.mjs`.
- `@libsql/client/web` funciona en Netlify Functions.
- Variables de entorno: `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

## Convenciones generales de código

- Componentes React: siempre con directiva `client:load`.
- **Imports**: siempre con alias `@/` y extensión explícita (`.ts`, `.tsx`, `.astro`, `.svg`). **Nunca** usar imports relativos a la ruta actual (`../` o `./`).
- **Nunca importar directorios ni `index.*`**: no hacer `import funTest from "@/scripts/data"` (resuelve al `index.*` del directorio) ni importar `scripts/data/index.*`. Importar siempre el archivo exacto con su extensión, ej. `import funTest from "@/scripts/data/index.ts"`.
- Estilos: Astro usa `class`, React usa `className`.
- Sin `key={}` en elementos HTML dentro de `.astro`.
- `data-create` usa sintaxis con `=` (`data-create="categories"`), no con guiones.
- **Sin `alert()`/`confirm()`/`prompt()` nativos**: confirmación de borrado con `ConfirmDelete` (vía `DeleteHandler.astro`); errores de formulario inline dentro del modal con `role="alert"`.
