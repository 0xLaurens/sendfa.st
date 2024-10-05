/// <reference path="../.astro/types.d.ts" />
interface ImportMetaEnv {
    readonly PUBLIC_SUPPORT_EMAIL: string
    readonly PUBLIC_WS_PROTOCOL: string
    readonly PUBLIC_WS_HOST: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}