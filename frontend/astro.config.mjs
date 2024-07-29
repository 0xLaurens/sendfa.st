import {defineConfig} from 'astro/config';
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
    output: "hybrid",
    integrations: [tailwind()],
    adapter: cloudflare({
        imageService: "compile",
    }),
});