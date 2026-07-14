import {defineConfig} from 'astro/config';
import tailwind from "@tailwindcss/vite";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
    site: "https://sendfa.st",
    output: "hybrid",
    integrations: [sitemap(), svelte()],
    adapter: node({
        mode: "standalone"
    }),
    vite: {
        plugins: [tailwind()]
    },
    security: {
        checkOrigin: true
    }
});
