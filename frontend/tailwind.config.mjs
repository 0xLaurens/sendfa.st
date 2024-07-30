/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {},
    },
    plugins: [
        require('daisyui')
    ],
    daisyui: {
        themes: [
            {
                light: {
                    ...require('daisyui/src/theming/themes')['light'],
                    primary: "#7349ff",
                },
            },
        ],
    },
}
