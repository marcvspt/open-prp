// @ts-check
import { defineConfig, envField } from 'astro/config';

import react from '@astrojs/react';
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";
import clerk from "@clerk/astro";

import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: "server",

  adapter: netlify(),

  integrations: [react(), clerk({
    afterSignOutUrl: "/app/login",
  })],

  vite: {
    plugins: [tailwindcss(), svgr()],
  },

  site: 'https://ophrp.marcvspt.tech',

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