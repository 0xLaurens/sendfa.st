// With `output: 'hybrid'` configured:
export const prerender = false;
import type {Provider} from "@supabase/supabase-js";

import type {APIRoute} from "astro";
import {supabase} from "../../../lib/supabase";

export const POST: APIRoute = async ({request, cookies, redirect}) => {
    const body = await request.json();
    if (!body) {
        return new Response(JSON.stringify({
            error: "Request body is required",
        }), {status: 400});
    }

    const {email, password, provider} = body;
    const validProviders = ["google"];

    if (provider && validProviders.includes(provider)) {
        const {data, error} = await supabase.auth.signInWithOAuth({
            provider: provider as Provider,
            options: {
                redirectTo: new URL("/api/auth/callback", import.meta.url).toString(),
            },
        });

        if (error) {
            return new Response(JSON.stringify({
                error: error?.message,
            }), {status: 500})
        }

        return redirect(data.url);
    }

    if (!email || !password) {
        return new Response(JSON.stringify({
            error: "Email and password are required",
        }), {status: 400});
    }

    const {data, error} = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return new Response(JSON.stringify({
            error: error?.message,
        }), {status: 500})
    }

    const {access_token, refresh_token} = data.session;
    cookies.set("sb-access-token", access_token, {
        path: "/",
    });
    cookies.set("sb-refresh-token", refresh_token, {
        path: "/",
    });
    return new Response(JSON.stringify({
        message: "Sign in successful",
    }), {status: 200});
};