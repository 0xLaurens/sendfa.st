export const prerender = false;
import type {Provider} from "@supabase/supabase-js";


import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, redirect }) => {
    const body = await request.json();

    if (!body) {
        return new Response(JSON.stringify({
            error: "Request body is required",
        }), {status: 400});
    }

    const { email, password, provider } = body;

    const validProviders = ["google"];

    if (provider && validProviders.includes(provider)) {
        const {data, error} = await supabase.auth.signInWithOAuth({
            provider: provider as Provider,
            options: {
                redirectTo: new URL("/api/auth/callback", import.meta.url).toString(),
            },
        });

        if (error) {
            return new Response(error.message, {status: 500});
        }

        return redirect(data.url);
    }

    if (!email || !password) {
        return new Response(JSON.stringify({
            error: "Email and password are required",
        }), {status: 400});
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.log("Sign up error:", error);
        return new Response(JSON.stringify({
            error: error.message,
        }), { status: 500 });
    }

    return redirect("/signin");
};