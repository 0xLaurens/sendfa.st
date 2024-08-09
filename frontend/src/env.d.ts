interface ImportMetaEnv {
    readonly SUPABASE_URL: string
    readonly SUPABASE_ANON_KEY: string
    readonly STRIPE_PUBLIC_KEY: string
    readonly STRIPE_KEY: string
    readonly SENDFAST_PRO_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}