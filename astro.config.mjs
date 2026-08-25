// @ts-check
import { defineConfig, envField } from 'astro/config';

import { getClerkLocalization } from '@/lib/i18n/clerk-localizations.ts';
import { DEFAULT_LOCALE } from '@/lib/i18n/locale.ts';

import react from '@astrojs/react';
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";
import clerk from "@clerk/astro";

import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: "server",

  prefetch: false,

  adapter: netlify(),

  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
      fallbackType: "redirect",
    },
  },

  integrations: [react(), clerk({
    afterSignOutUrl: "/es/app/login",
    localization: getClerkLocalization(DEFAULT_LOCALE),
  })],

  vite: {
    plugins: [tailwindcss(), svgr()],
  },

  site: 'https://oprp.marcvspt.tech',

  env: {
    schema: {
      TURSO_DB_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: false
      }),
      TURSO_DB_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: false
      }),
      PUBLIC_CLERK_PUBLISHABLE_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: false
      }),
      CLERK_SECRET_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: false
      }),
    }
  },
});