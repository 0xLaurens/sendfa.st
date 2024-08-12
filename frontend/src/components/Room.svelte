<script lang="ts">
    import {onMount} from "svelte";
    import WebsocketManager from "../lib/socket.ts";
    import {roomCode} from "../lib/socket.ts";
    import FileButton from "./FileButton.svelte";
    import LinkButton from "./LinkButton.svelte";
    import QrButton from "./QrButton.svelte";
    import {Loader2} from "lucide-svelte";

    export let code: string;

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
    })
</script>
{#if code}
    <div class="relative z-10 max-w-5xl mx-auto flex flex-col items-center justify-center gap-16 lg:gap-20 px-8 py-12 lg:py-32 min-h-screen">
        <div class="relative flex flex-col gap-3 max-w-md items-center justify-center text-center">
            <p class="text-2xl font-semibold">Room code: <span class="font-black">{code}</span></p>
            <p class="text-base-content/70">
                This space is a bit empty. Invite your other device using your unique
                link or code!
            </p>
            <div class="flex justify-center gap-3">
                <FileButton/>
                <LinkButton/>
                <QrButton code={code}/>
            </div>
        </div>
    </div>
{:else}
    <div class="relative z-10 max-w-5xl mx-auto flex flex-col items-center justify-center gap-16 lg:gap-20 px-8 py-12 lg:py-32 min-h-screen">
        <div class="relative flex gap-3 max-w-md items-center justify-center text-center">
            <p class="text-base-content/70">
                Creating a room...
            </p>
            <Loader2 class="animate-spin"/>
        </div>
    </div>
{/if}

