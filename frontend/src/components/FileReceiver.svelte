<script lang="ts">
    import {formatFileSize} from "../util/filesize.ts";
    import {
        FileAudioIcon,
        FileIcon,
        FileVideoIcon,
        ImageIcon,
        Loader2Icon,
        ShareIcon,
        UploadIcon,
    } from "lucide-svelte";
    import type {FileOffer} from "../types/file.ts";
    import {onDestroy, onMount} from "svelte";
    import WebsocketManager, {isConnected, roomId} from "../lib/socket.ts";
    import {acceptIncomingFileOffer, currentFileOffer} from "../lib/file.ts";
    import {truncateFileName} from "../util/truncate.js";

    let offer: FileOffer | null;
    let manager: WebsocketManager;
    let connected = false;

    export let RoomId: undefined | string;

    onMount(() => {
        if (!RoomId) {
            console.error("RoomId is not defined");
        }

        roomId.set(RoomId);
        manager = new WebsocketManager("ws://localhost:7331/api/websocket");
        manager.connect();

        currentFileOffer.subscribe(value => {
            console.log('Received file offer:', value)
            if (value == null) return
            offer = value
        })
    })

    onDestroy(() => {
        manager?.close();
    })

    isConnected.listen(value => {
        connected = value;
    })

    function acceptFiles() {
        acceptIncomingFileOffer()
    }
</script>

<!--{#if RoomId && connected}-->
<div class="card max-w-md flex flex-col gap-3 space-y-6 bg-base-100">
    <div class="card-body gap-16">
        <div class="flex items-center space-x-4">
            <div class="bg-gray-100 p-2 rounded-full">
                <ShareIcon class="h-6 w-6"/>
            </div>
            <div>
                <p class="text-2xl sm:text-3xl font-bold modal-title">File transfer</p>
                {#if offer && connected}
                    <p class="text-gray-500 modal-description">The following files are available for you to
                        download:</p>
                {/if}
            </div>
        </div>
        <div>
            {#if !connected}
                <div class="flex flex-row gap-3">
                    <Loader2Icon class="animate-spin"/>
                    <p class="text-base-content/70 text-lg">Setting up the connection</p>
                </div>
            {:else}
                {#if offer}
                    <ul class="space-y-2">
                        {#each offer.files as file}
                            <li class="flex flex-col py-2">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-3">
                                        {#if file.mime.startsWith("image/")}
                                            <ImageIcon class="h-5 w-5"/>
                                        {/if}
                                        {#if file.mime.startsWith("audio/")}
                                            <FileAudioIcon class="h-5 w-5"/>
                                        {/if}
                                        {#if file.mime.startsWith("video/")}
                                            <FileVideoIcon class="h-5 w-5"/>
                                        {/if}
                                        {#if !file.mime.startsWith("image/") && !file.mime.startsWith("audio/") && !file.mime.startsWith("video/")}
                                            <FileIcon class="h-5 w-5"/>
                                        {/if}
                                        <span class="font-medium">{truncateFileName(file.name)}</span>
                                    </div>
                                    <span class="text-gray-500 text-sm">{formatFileSize(file.size)}</span>
                                </div>
                                <div>
                                    <progress class="w-full progress" value="0" max="100"></progress>
                                </div>
                            </li>
                        {/each}
                    </ul>
                    <div class="mt-4">
                        <span class="text-gray-500">Total size: {formatFileSize(offer.files.reduce((acc, file) => acc + file.size, 0))}</span>
                    </div>
                {:else}
                    <div class="text-center">
                        <p class="text-base-content/70 text-lg">No files received yet.</p>
                    </div>
                {/if}
            {/if}
        </div>
        <div class="flex flex-col gap-3">
            <button disabled="{!connected || !offer}" on:click={acceptFiles} class="btn btn-neutral w-full">
                <UploadIcon class="h-5 w-5"/>
                Start download
            </button>
        </div>
    </div>
</div>
<!--{:else}-->
<!--    <div class="relative z-10 max-w-5xl mx-auto flex flex-col items-center justify-center gap-16 lg:gap-20 px-8 py-12 lg:py-32 min-h-screen">-->
<!--        <div class="relative flex gap-3 max-w-md items-center justify-center text-center">-->
<!--            <p class="text-base-content/70">-->
<!--                Connecting to the room...-->
<!--            </p>-->
<!--            <Loader2Icon class="animate-spin"/>-->
<!--        </div>-->
<!--    </div>-->
<!--{/if}-->