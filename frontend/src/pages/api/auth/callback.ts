import type {APIRoute} from "astro";
import {supabase} from "../../../lib/supabase.ts";

export const GET: APIRoute = async ({url, cookies, redirect}) => {
    const authCode = url.searchParams.get("code");
    console.log(authCode)

    if (!authCode) {
        return new Response("No auth code provided", {status: 400});
    }

    const {data, error} = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) {
        return new Response(error.message, {status: 500});
    }

    const {access_token, refresh_token} = data.session;
    cookies.set("sb-access-token", access_token );
    cookies.set("sb-refresh-token", refresh_token);

    return redirect("/dashboard");
}