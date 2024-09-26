<script lang="ts">
    import {onMount, onDestroy} from "svelte";
    import WebsocketManager, {users} from "../lib/socket.ts";
    import {roomCode, identity, isConnected} from "../lib/socket.ts";
    import FileButton from "./FileButton.svelte";
    import FileDialog from "./FileDialog.svelte";
    import LinkButton from "./LinkButton.svelte";
    import QrButton from "./QrButton.svelte";
    import {Loader2} from "lucide-svelte";
    import type {User} from "../types/user.ts";

    export let code: string | undefined;
    let user_identity: string;
    let connected: boolean;
    let connected_users: User[] = [];

    let manager: WebsocketManager

    onMount(() => {
        if (code != null) {
            console.log("Setting room code to", code)
            roomCode.set(code)
            console.log("Room code set to", roomCode.get())
        }

        manager = new WebsocketManager("ws://localhost:7331/api/websocket")
        manager.connect()
        roomCode.subscribe(value => {
            if (value == null) return
            history.pushState({}, "", `/app/${value}`)
            code = value
        })

        identity.subscribe(value => {
            user_identity = JSON.stringify(value)
        })

        isConnected.subscribe(value => {
            if (value == null) return
            connected = value
        })
        users.subscribe(value => {
            connected_users = [...value]
        })
    })


    onDestroy(() => {
        manager?.close()
    })
</script>

<FileDialog/>
<!--<AppNavigation/>-->
{#if code && connected}
    <div class="relative z-10 max-w-5xl mx-auto flex flex-col items-center justify-center gap-16 lg:gap-20 px-8 py-12 lg:py-32 min-h-screen">
        <div class="relative flex flex-col gap-3 max-w-md items-center justify-center text-center">
            <p class="text-2xl font-semibold">
                Room code: <span class="font-black">{code}</span>
                <span class="indicator-item badge animate-pulse {connected ? 'badge-success' : 'badge-error'}"></span>
            </p>
            {#if connected_users.length > 0}
                <p class="text-base-content/70">
                    You are connected with {connected_users.length} other device(s).
                </p>
            {:else}
                <p class="text-base-content/70">
                    This space is a bit empty. Invite your other device using your unique
                    link or code!
                </p>
            {/if}
            <div class="flex justify-center gap-3">
                <FileButton/>
                <LinkButton/>
                <QrButton link={code}/>
            </div>
        </div>
    </div>
{:else}
    <div class="relative z-10 max-w-5xl mx-auto flex flex-col items-center justify-center gap-16 lg:gap-20 px-8 py-12 lg:py-32 min-h-screen">
        <div class="relative flex gap-3 max-w-md items-center justify-center text-center">
            <p class="text-base-content/70">
                Connecting to the room...
            </p>
            <Loader2 class="animate-spin"/>
        </div>
    </div>
{/if}

