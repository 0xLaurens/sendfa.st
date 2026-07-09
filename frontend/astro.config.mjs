import {defineConfig} from 'astro/config';
import tailwind from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
    site: "https://sendfa.st",
    output: "static",
    integrations: [sitemap(), tailwind(), svelte()],
    adapter: cloudflare({
        imageService: "cloudflare"
    }),
    security: {
        checkOrigin: true
    }
});