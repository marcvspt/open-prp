# Open Personal Resource Planning

## Desarrollo

Al iniciar el servidor de desarrollo, usa el modo background:

```bash
astro dev --background
```

Gestiona el servidor en background con `astro dev stop`, `astro dev status` y `astro dev logs`.

## Estructura del proyecto

- **Ruteo**: `/` → landing page pública con CTA a `/app`. `/app` → redirige a `/app/dashboard` (logueado) o `/app/login` (no logueado). El middleware protege `/app/*` (excepto `/app/login`). `/app/login` redirige a `/app/dashboard` si ya está autenticado.
- **Páginas**: cada módulo tiene una página en `src/pages/app/*.astro` y rutas API en `src/pages/api/*/`
- **Módulos** (en `src/lib/modules/`): `transactions`, `card-monthly`, `cards`, `cashback`, `events`, `installments`, `notes`, `pantry`, `payment-methods`, `recurring-payments`, `shopping`, `tasks`, `users`
- **Componentes React**: usan la directiva `client:load` para la hidratación
- **Todos los imports**: usan el alias `@/` **con extensión explícita del archivo** (ej. `@/lib/db/client.ts`, `@/components/ui/Select.tsx`, `@/assets/home.svg`)
- **Tipos**: todos los tipos de dominio/compartidos viven en `src/lib/types/` (un archivo por dominio, ej. `dashboard.ts`, `transaction.ts`). Nunca definir tipos de dominio inline en componentes ni en módulos de API.
- **Separación lógica vs UI**: la lógica sin dependencias de framework vive en `src/lib/` para poder reutilizarla si la capa de UI migra algún día:
  - `src/lib/ui/` — lógica de browser (vanilla TS): `theme.ts` (get/save/apply/resolve + `initThemeSync`), `currency.ts`, `sidebar.ts` (`initSidebar`, `initUserAreaForward`), `tabs.ts` (`initTabs`, cambiador de tabs genérico sincronizado con el hash de la URL)
  - `src/lib/dashboard/api.ts` — carga de datos del dashboard (`fetchDashboardMonth`, `fetchDashboardHistory`) y mutaciones (`payCardDebtFull`, `payCardDebtPartial`) + `EMPTY_DASHBOARD_MONTH`
  - `src/lib/format.ts` — `formatCurrency`
  - `src/lib/safeFetch.ts` — `safeFetch` (nunca lanza excepciones) + `fetchList` (normaliza arrays planos y `PaginatedResponse`)
  - `src/lib/form-fields.ts` — configuraciones compartidas de campos de formulario para CrudModal: `CURRENCY_OPTIONS`, `TYPE_OPTIONS`, `CURRENCY_SYMBOL`, `FIELD_TYPE_CURRENCY`, `FIELD_TYPE`, `paymentMethodField()`, `categoryField()`, `cardField()`, `dateField()`.
    - **Siempre** usar estos helpers en lugar de definir fields inline en las páginas.
    - Si se necesita una moneda, tipo, método de pago, categoría, tarjeta o fecha nueva, se actualiza aquí y se refleja en todos los CRUDs.
    - Los campos obligatorios (`required: true`) muestran un `*` rojo junto a la label automáticamente en el CrudModal.
    - **Orden estándar de campos** en todos los formularios CRUD: Fecha → Tipo → Descripción → Montos → Moneda → Método de pago/Tarjeta → Categoría → campos específicos del módulo. Los que no apliquen se omiten, pero el orden relativo se mantiene siempre.
    - **NOT NULL en DB**: cualquier campo marcado como `required: true` en el formulario debe tener `NOT NULL` en el schema SQL. Si la lógica del negocio dice que siempre tendrá un valor, la DB debe reflejarlo. Las únicas excepciones son campos genuinely opcionales (ej. `description`, `category_id`).
- **Tags `<script>` de Astro**: importar funciones init desde `src/lib/ui/` en vez de JS imperativo inline (Astro los empaqueta como módulos)
- **UI compartida vs UI de app**: `src/components/ui/` para componentes usados en toda la app (ThemeToggle, Select, MultiSelect, ErrorBoundary); `src/components/app/ui/` para UI exclusiva de la app (CrudModal, DataTable, FormModal, FilterLinks, etc.)

### Assets

- 18 archivos de iconos SVG en `src/assets/` (nombres en kebab-case minúsculas: `home.svg`, `sun.svg`, `dollar.svg`, `card.svg`, etc.)
- Se importan vía el alias `@/assets/*` con `vite-plugin-svgr`; el identificador importado se mantiene en PascalCase con sufijo `Icon` (ej. `import HomeIcon from "@/assets/home.svg"`)
- En archivos `.tsx`, usar el sufijo `?react` para obtener un componente React (ej. `import SunIcon from "@/assets/sun.svg?react"`)

### Layouts

- `BaseLayout.astro` — `<html>`, `<head>`, meta tags, favicon, script inline de modo oscuro y lógica del título de página (`"Open PRP | {title}"` o `"Open PRP"`) compartidos
- `AppLayout.astro` — extiende BaseLayout; envuelve el contenido con Sidebar + main + pantalla de login para no autenticados
- `LandingLayout.astro` — extiende BaseLayout; envuelve el contenido con Header + slot + Footer

### Sidebar

- Fija `w-64` en escritorio, oculta fuera de pantalla (`-translate-x-full`) en móvil
- Drawer deslizante en móvil: hamburguesa flotante arriba a la izquierda, backdrop con overlay, se cierra al hacer clic en un link de navegación
- Sección inferior: link de GitHub, ThemeToggle, CurrencySelect, UserButton (de `@clerk/astro/components`) + texto "Mi cuenta" con clic reenviado
- El área del logo muestra "Open PRP" (sin icono)
- Los links de navegación son data-driven: constante `APP_LINKS` (array de grupos `{ title?, links: [{ href, label, icon }] }`) renderizada con `.map()` anidados. El estado activo usa `currentPath.startsWith(href)`. Para añadir una sección/link nuevo, basta con agregar una entrada al array.

## TypeScript

- **Sin tipos `any`**. Los bind args de SQL usan `(string | number | boolean | null)[]`.
- **Bloques catch**: omitir el parámetro de error si no se usa (`catch {`), o usar `catch (e: unknown)` y registrarlo.
- **CategoryType**: `"global" | "personal"` (sin `"family"` ni `"both"`)
- **PaymentMethodType**: `"global" | "personal" | "card"` (sin `"family"` ni `"both"`)
- Sin `scope` ni `family_id` en ningún tipo ni repositorio.

## Base de datos

### Schema y seed

Schema SQL: `db/schema/*.sql` — archivos modulares (uno por módulo de negocio), con prefijo numérico para orden de creación. Cada archivo usa `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS` para ser idempotente.

**IMPORTANTE — Cambios a la DB en producción**: el aplicativo ya está en producción. Cuando un cambio requiera modificar la estructura de la base de datos:

1. Entregar al usuario la sentencia SQL lista para ejecutar manualmente en su base de datos de producción (ej. `ALTER TABLE`, `CREATE INDEX`, etc.).
2. Actualizar también los archivos `db/schema/*.sql` con el cambio, reflejando el estado final deseado.

Los archivos de schema representan el estado final para un **despliegue nuevo** (base de datos desde cero), por lo que NO deben contener `ALTER TABLE` ni migraciones incrementales — solo `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` con la estructura definitiva.

- Tabla `categories` tiene `UNIQUE(user_id, name)` para evitar duplicados.
- Tabla `events` y `tasks` no tienen campo `title` — solo `description`.
- Tabla `recurring_payment_monthly` tiene columnas `category_id` y `payment_method_id` para snapshot al momento de creación.

- Seed: `pnpm db:seed` (carga `.env` + `.env.development`)
- Seed producción: `pnpm db:seed:prod` (carga `.env` + `.env.production`)
- El script usa `@libsql/client` (versión Node) para ejecución directa.

### Capa de repositorios

Cada módulo en `src/lib/modules/*/repository.ts` usa `getDb()` de `src/lib/db/client.ts`, que devuelve una instancia cruda de `@libsql/client/web`. Todas las queries usan `db.execute({ sql, args })` con bind parameters `?` para prevenir inyección SQL.

- **Categories**: `create()` verifica si el nombre ya existe antes de insertar; si existe, devuelve el existente (la API lo previene con 409).
- **Recurring Payments**: `upsertMonthly()` hace snapshot de `category_id` y `payment_method_id` desde la plantilla al momento de creación.
- **findAll() en recurring-payments**: LEFT JOIN con `categories` y `payment_methods` para traer `category_name`, `payment_method_name`, `payment_method_icon`.

Helpers comunes:

- `nextSeq("table_name")` — obtiene `COALESCE(MAX(seq), 0) + 1` de una tabla vía SQL crudo
- `getDb()` — crea/devuelve un cliente singleton de `@libsql/client/web`

## Auth y middleware

- Usa `@clerk/astro` con `clerkMiddleware` en `src/middleware.ts`
- **Sincronización de usuario Clerk**: en cada request, `needsSync()` verifica si `email`/`display_name` están vacíos O si `updated_at` tiene más de 5 min. Si es así, llama a la API de Clerk (`users.getUser`) y actualiza `email`/`display_name` en la DB local.
- Los hooks de React de Clerk se importan desde `@clerk/astro/react` (ej. `useAuth`), NO desde `@clerk/clerk-react` (no instalado).
- `UserButton` de `@clerk/astro/components` en el Sidebar con `afterSignOutUrl="/app/login"` y `client:load`.

## UI / Componentes

### Tema / Colores

- Toggle de modo oscuro vía `ThemeToggle.tsx`, guarda la preferencia en localStorage.
- Las variables CSS en `global.css` manejan el tema claro/oscuro mediante tokens `@theme`.
- **Colores semánticos**: `primary`, `success`, `danger`, `warning`, `info` — cada uno con variantes `-hover`, `-text`, `-bg`, `-border`; los valores oscuros se definen en la clase `.dark`.
- **Colores base**: `surface`, `surface-alt`, `panel`, `border`, `border-light`, `string`, `string-muted`, `nav`, `nav-hover`, `nav-active`, `nav-active-text`, `overlay`.
- Los componentes de Clerk se adaptan automáticamente vía `color-scheme: light` en `:root` y `color-scheme: dark` en `.dark`.

### Select y MultiSelect

- `Select.tsx` — combobox accesible con teclado. Usado en toda la app.
- `MultiSelect.tsx` — selección múltiple con checkboxes y opción "Todas las secciones".

### CrudModal

- `CrudModal.tsx` renderiza un modal de formulario CRUD genérico. Se dispara con los atributos `data-create="{module}"` y `data-edit-{module}="{id}"`.
- El atributo `data-create` usa sintaxis con `=` (ej. `data-create="categories"`), NO con guiones (`data-create-categories`).
- Después de guardar, llama a `window.location.reload()`. Los componentes que usan `history.replaceState` deben preservar `location.pathname` (no usar `"/"` como fallback) para evitar recargar a la raíz.

### PageHeader

- `PageHeader.astro` renderiza título + botón de crear opcional. Cuando la página tiene filtros debajo del header, el botón de crear debe moverse a la fila de filtros (usar `flex items-center justify-between gap-2 flex-wrap`) en vez de estar en el header.

### Eventos y Tareas (layout de cards)

- Las páginas de **Eventos** y **Tareas** usan un grid de cards en vez de DataTable.
- Los **Eventos** no tienen campo `title` — solo `description`. Las cards muestran: descripción, badge de estado (con color + icono), fechas de inicio/fin, categoría con icono, ubicación.
- Las **Tareas** no tienen campo `title` — solo `description`. Las cards muestran: checkbox, descripción, badge de prioridad (con color + icono), categoría con icono, fecha de vencimiento.

### Dashboard

- `DashboardContent.tsx` renderiza 6 tabs (Resumen, Tarjetas, Plazos, Eventos, Tareas, Historial) con el MonthSelector a la derecha. No contiene lógica de fetch — todos los datos vienen de `src/lib/dashboard/api.ts` en un único estado `monthData` (`DashboardMonthData`).
- Las cards de resumen usan `StatCard.tsx` (`label`, `value`, `colorClass`, `sub` opcional).
- La barra de tabs usa `flex items-end justify-between border-b border-border pb-0`; el MonthSelector tiene `pb-2` para alinearse con la línea del borde.
- Los links de filtro de las páginas usan rutas con prefijo `/app/` (ej. `/app/transactions?type=expense`) y el componente compartido `FilterLinks.astro` (`filters: { value, label, href }[]` + `active`).

### Landing Page

- `LandingLayout.astro` envuelve Header + slot + Footer.
- `Header.astro`: los links de texto son data-driven vía la constante `LANDING_LINKS` (`{ href, label, external? }[]`) renderizada con `.map()`; luego CTA "Ir a la app", icono de GitHub, ThemeToggle.
- Cards de características: `FeatureCard.astro` (props `title` + `description`, icono vía slot) renderizadas desde el array `FEATURES_INFO` en `index.astro`.
- `Footer.astro`: link de GitHub + link de marcvspt.tech.

## Despliegue

Adaptador de Netlify configurado en `astro.config.mjs`. Conectar el repo en Netlify y configurar las variables de entorno en el dashboard.

El cliente de BD (`@libsql/client/web`) funciona en Netlify Functions sin cambios.

## Documentación

Documentación completa: [https://docs.astro.build](https://docs.astro.build)

Consulta estas guías antes de trabajar en tareas relacionadas:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
