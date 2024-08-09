import {defineConfig} from 'astro/config';
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
    site: "https://sendfa.st",
    output: "hybrid",
    integrations: [
        sitemap(),
        tailwind()
    ],
    adapter: cloudflare({
        imageService: "compile",
    }),
});