<script lang="ts">
    import {formatFileSize} from "../util/filesize.ts";
    import {
        CircleXIcon,
        FileAudioIcon,
        FileIcon,
        FileVideoIcon, FrownIcon, HeartIcon,
        ImageIcon,
        Loader2Icon,
        ShareIcon,
        UploadIcon,
    } from "lucide-svelte";
    import type {FileOffer} from "../types/file.ts";
    import {onDestroy, onMount} from "svelte";
    import WebsocketManager, {downloadCancelled, isConnected, roomExists, roomId} from "../lib/socket.ts";
    import {acceptIncomingFileOffer, currentFileOffer, downloadFinished} from "../lib/file.ts";
    import {truncateFileName} from "../util/truncate.ts";

    let offer: FileOffer | null;
    let manager: WebsocketManager;


    export let RoomId: undefined | string;

    onMount(() => {
        if (!RoomId) {
            console.error("RoomId is not defined");
        }

        roomId.set(RoomId);
        console.log(import.meta.env.SUPABASE_ANON_KEY)
        manager = new WebsocketManager(`${import.meta.env.PUBLIC_WS_PROTOCOL}://${import.meta.env.PUBLIC_WS_HOST}/api/websocket`);
        manager.connect();

        currentFileOffer.subscribe(value => {
            if (value == null) return
            offer = value
        })
    })

    onDestroy(() => {
        manager?.close();
    })

    function acceptFiles() {
        acceptIncomingFileOffer()
    }

</script>
<div class="card min-h-screen sm:min-h-0 bg-base-100 w-screen sm:w-full sm:h-auto max-w-lg gap-3 space-y-6">
    <div class="card-body flex-col justify-between h-full md:h-auto gap-16">
        <div class="flex items-center space-x-4">
            <div class="bg-gray-100 p-2 rounded-full">
                <ShareIcon class="h-6 w-6"/>
            </div>
            <div>
                <p class="text-2xl sm:text-3xl font-bold modal-title">File transfer</p>
            </div>
        </div>
        {#if $downloadFinished}
            <div>
                <p class="text-xl">Download finished!</p>
                <p class="text-gray-500">Please consider donating! It helps the platform running ❤️</p>

            </div>
        {:else if !$isConnected && !$roomExists}
            <div>
                <div class="flex flex-row gap-3">
                    <Loader2Icon class="animate-spin"/>
                    <p class="text-base-content/70 text-lg">Setting up the connection</p>
                </div>
            </div>
        {:else if $currentFileOffer && !$downloadCancelled}
            <div>
                <ul class="space-y-2">
                    {#each $currentFileOffer.files as file}
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
                        </li>
                    {/each}
                </ul>
                <div class="mt-4">
                    <span class="text-gray-500">Total size: {formatFileSize($currentFileOffer.files.reduce((acc, file) => acc + file.size, 0))}</span>
                </div>
            </div>
        {:else if !$roomExists}
            <div>
                <FrownIcon class="w-32 h-32 mx-auto"/>
                <p class="text-xl">Invalid link</p>
                <p class="text-gray-500">The link you received is incorrect. Please try again. <a
                        class="link link-primary" href="/">Return to homepage</a></p>
            </div>
        {:else if $downloadCancelled}
            <div>
                <CircleXIcon class="w-32 h-32 mx-auto"/>
                <p class="text-xl">Download cancelled</p>
                <p class="text-gray-500">The download has been cancelled by the sender. <a class="link link-primary"
                                                                                           href="/">Return to
                    homepage</a></p>
            </div>
        {:else}
            <div class="text-center">
                <p class="text-base-content/70 text-lg">No files received yet.</p>
            </div>
        {/if}
        <div class="flex flex-col gap-3">
            {#if $downloadFinished}
                <a href="/donate" class="btn btn-primary w-full">
                    <HeartIcon class="h-5 w-5"/>
                    Donate
                </a>
            {:else}
                <button disabled="{!$isConnected || !offer}" on:click={acceptFiles} class="btn btn-neutral w-full">
                    <UploadIcon class="h-5 w-5"/>
                    Start download
                </button>
            {/if}
        </div>
    </div>
</div>