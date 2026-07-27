# Open PRP

**Personal Resource Planning** — Gestión financiera y organización personal.

Centraliza transacciones, tarjetas de crédito, plazos, pagos recurrentes, compras, despensa, notas, tareas, eventos, cashback y más en un solo lugar. PWA instalable en móvil.

## Funcionalidades

| Módulo | Descripción |
|---|---|
| **Dashboard** | Resumen mensual con 6 tabs: gastos/ingresos, tarjetas, plazos, eventos, tareas e historial |
| **Transacciones** | Registro de ingresos y gastos con categorías, moneda y método de pago |
| **Tarjetas** | Gestión de tarjetas de crédito con cálculo automático de deuda mensual |
| **Plazos** | Compras a plazos con seguimiento de cuotas restantes |
| **Pagos recurrentes** | Suscripciones y servicios fijos con snapshot mensual |
| **Cashback** | Seguimiento de reembolsos y beneficios |
| **Métodos de pago** | Efectivo, transferencias, tarjetas (se crean automáticamente al añadir tarjeta) |
| **Compras** | Lista de compras con check y completado |
| **Despensa** | Inventario de despensa con categorías propias |
| **Tareas** | Gestión de tareas con prioridad, categoría y fecha de vencimiento |
| **Eventos** | Calendario de eventos con estado, fechas, ubicación y categoría |
| **Notas** | Notas personales etiquetadas |
| **Categorías** | Sistema unificado de categorías personales y globales, multicategoría por sección |

## Stack

| Capa | Tecnología |
|---|---|
| Framework | [Astro](https://astro.build) SSR |
| UI React | [React 19](https://react.dev) |
| Estilos | [Tailwind CSS v4](https://tailwindcss.com) |
| Base de datos | [Turso](https://turso.tech) (libSQL) |
| Auth | [Clerk](https://clerk.com) |
| PWA | Service Worker + Web Manifest |
| Despliegue | Netlify |

## Primeros pasos

```sh
# 1. Clonar
git clone <tu-fork>
cd open-prp

# 2. Instalar
pnpm install

# 3. Variables de entorno (.env.development)
TURSO_DB_URL=libsql://<tu-db>.turso.io
TURSO_DB_TOKEN=<tu-token>
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_********************
CLERK_SECRET_KEY=sk_********************

# 4. Sembrar DB
pnpm db:seed:dev

# 5. Servidor desarrollo
pnpm dev
```

### Configurar Turso

```sh
pnpm add -g @turso/cli
turso auth login
turso db create open-prp
turso db show open-prp --url        # → TURSO_DB_URL
turso db tokens create open-prp     # → TURSO_DB_TOKEN
```

### Configurar Clerk

1. Crea app en [clerk.com](https://clerk.com)
2. Copia `PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`
3. En el dashboard de Clerk, agrega `http://localhost:4321` y tu dominio como redirect URLs

## Comandos

| Comando | Acción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `astro dev --background` | Dev en background |
| `pnpm build` | Build de producción |
| `pnpm preview` | Preview del build |
| `pnpm db:seed:dev` | Seed desarrollo |
| `pnpm db:seed:prod` | Seed producción |

## Créditos

Desarrollado con [OpenCode](https://opencode.ai).
