import {defineConfig} from 'astro/config';
import tailwind from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
    site: "https://sendfa.st",
    output: "server",
    integrations: [sitemap(), svelte()],
    adapter: cloudflare({
        imageService: "cloudflare"
    }),
    vite: {
        plugins: [tailwind()]
    },
    security: {
        checkOrigin: true
    }
});
