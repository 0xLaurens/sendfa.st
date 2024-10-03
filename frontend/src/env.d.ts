/// <reference path="../.astro/types.d.ts" />
interface ImportMetaEnv {
    readonly SUPABASE_URL: string
    readonly SUPABASE_ANON_KEY: string
    readonly STRIPE_PUBLIC_KEY: string
    readonly STRIPE_KEY: string
    readonly SENDFAST_PRO_URL: string
    readonly SUPPORT_EMAIL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}