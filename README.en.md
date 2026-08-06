# Open PRP

**Personal Resource Planning** — your app for personal finances and daily organization, all in one place.

Manage your income and expenses, credit cards, recurring payments, installment purchases, shopping list, pantry, tasks, notes and events from any device. It's a PWA: install it on your phone and it works like a native app.

## What can you do with Open PRP?

| Section | Purpose |
|---|---|
| **Dashboard** | Monthly summary: income, expenses, balance, card debt, installments and recurring payments. Everything on a single screen. |
| **Transactions** | Record your income and expenses with category, currency and payment method. Search and filter them by month, type or category. |
| **Cards** | Keep track of your credit cards: limit, statement date, payment date and debt automatically calculated per month. Mark your payments so you don't miss them. |
| **Installments** | Installment purchases with tracking of paid and remaining installments. |
| **Recurring payments** | Subscriptions and fixed services (Netflix, electricity, internet…). See how much you pay each month and mark them as paid. |
| **Cashback** | Record the refunds your cards give you back. |
| **Shopping list** | Create lists, add items from your pantry or by hand, mark what you already bought and finish the list. |
| **Pantry** | Inventory of your pantry with its own categories to know what you have and what you're missing. |
| **Tasks** | Your to-dos with priority, category and due date. |
| **Events** | Plan events with dates, location and category. |
| **Notes** | Personal notes with tags to organize them. |
| **Payment methods** | Cash, transfers, cards… cards are created automatically when you register them. |
| **Categories** | A unified category system: the same ones work for transactions, pantry, installments and more. |

## Features

- **Multi-currency**: choose your preferred currency (EUR, MXN or USD) and the app remembers it.
- **Automatic credit card debt calculation**: the app adds up your monthly expenses, installment payments and recurring payments to estimate how much you owe.
- **Installable (PWA)**: add it to your home screen and use it without opening the browser.
- **Responsive design**: works on mobile and desktop, with light or dark theme.
- **Your data, private**: each user only sees their own information.

## Getting started

1. Go to the app and create your account (you can use your email or continue with Google).
2. In **Payment methods** you already have 3 global presets (payroll, transfer and cash). Add your accounts.
3. Register your **cards** (credit cards automatically generate their payment method).
4. Add your first **transactions** or **recurring payments**.
5. Check your **Dashboard** every month to see how you're doing.

Everything is stored under your account: you can use it from your phone, computer or tablet.

## For developers

Want to contribute or run your own instance? All the technical documentation (architecture, database, API, components and contribution guides) is in **[DOCS.en.md](DOCS.en.md)**.

## Stack

| Layer | Technology |
|---|---|
| Framework | [Astro](https://astro.build) (SSR) |
| Interactive UI | [React 19](https://react.dev) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Database | [Turso](https://turso.tech) (libSQL) |
| Authentication | [Clerk](https://clerk.com) |
| PWA | Service Worker + Web Manifest |
| Deployment | Netlify |

## Credits

Built with [OpenCode](https://opencode.ai).
