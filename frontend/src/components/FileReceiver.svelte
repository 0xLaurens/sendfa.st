<script lang="ts">
    import {formatFileSize} from "../util/filesize.ts";
    import {
        ChevronDownIcon, ChevronUpIcon, CircleXIcon, DownloadIcon,
        FileAudioIcon,
        FileIcon,
        FileVideoIcon, FrownIcon, HeartIcon,
        ImageIcon,
        Loader2Icon,
        ShareIcon,
    } from "lucide-svelte";
    import {onDestroy, onMount} from "svelte";
    import WebsocketManager, {
        checkedRoomCode,
        downloadCancelled,
        isConnected, room,
        roomExists, roomId,
    } from "../lib/socket.ts";
    import {acceptIncomingFileOffer, currentFileOffer, downloadFinished} from "../lib/file.ts";
    import {truncateFileName} from "../util/truncate.ts";

    let manager: WebsocketManager;
    let showAllFiles = $state(false);
    const previewFileLimit = 8;

    interface Props {
        RoomId: undefined | string;
    }

    let { RoomId }: Props = $props();

    onMount(() => {
        if (!RoomId) {
            console.error("RoomId is not defined");
        }

        roomId.set(RoomId);
        manager = new WebsocketManager(`${import.meta.env.PUBLIC_WS_PROTOCOL}://${import.meta.env.PUBLIC_WS_HOST}/api/websocket`);
        manager.connect();
    })

    onDestroy(() => {
        manager?.close();
    })

    function acceptFiles() {
        acceptIncomingFileOffer()
    }

</script>

<div class="card relative h-[100dvh] bg-base-100 w-screen sm:w-full sm:max-h-[calc(100dvh-2rem)] max-w-lg {$currentFileOffer?.files.length > previewFileLimit ? 'sm:h-[min(100dvh-2rem,40rem)]' : 'sm:h-auto'}">
    <div class="card-body flex h-full min-h-0 flex-col gap-6">
        <div class="flex items-center space-x-4">
            <div class="bg-gray-100 p-2 rounded-full">
                <ShareIcon class="h-6 w-6"/>
            </div>
            <div>
                <p class="text-2xl sm:text-3xl font-bold modal-title">File transfer</p>
            </div>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto pb-28 pr-1">
            {#if $downloadFinished}
                <div>
                <p class="text-xl">Download finished!</p>
                <p class="text-gray-500">Please consider donating! It helps the platform running ❤️</p>

            </div>
            {:else if $downloadCancelled}
                <div>
                <CircleXIcon class="w-32 h-32 mx-auto"/>
                <p class="text-xl">Download cancelled</p>
                <p class="text-gray-500">The download has been cancelled by the sender. <a class="link link-primary"
                                                                                           href="/">Return to
                    homepage</a></p>
            </div>
            {:else if $isConnected === false || $checkedRoomCode === false}
                <div>
                <div class="flex flex-row gap-3">
                    <Loader2Icon class="animate-spin"/>
                    <p class="text-base-content/70 text-lg">Setting up the connection</p>
                </div>
            </div>
            {:else if $currentFileOffer}
                <div>
                <ul id="offered-files" class="space-y-2">
                    {#each $currentFileOffer.files.slice(0, showAllFiles ? undefined : previewFileLimit) as file}
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
            </div>
            {:else if ($roomExists === false && $checkedRoomCode && $isConnected) || $room?.user_count === 1}
                <div>
                <FrownIcon class="w-32 h-32 mx-auto"/>
                <p class="text-xl">Invalid link</p>
                <p class="text-gray-500">The link you received is incorrect. Please try again. <a
                        class="link link-primary" href="/">Return to homepage</a></p>
            </div>
            {:else}
                <div>
                <div class="flex flex-row gap-3">
                    <Loader2Icon class="animate-spin"/>
                    <p class="text-base-content/70 text-lg">Waiting for file(s)...</p>
                </div>
            </div>
            {/if}
        </div>
        {#if $currentFileOffer && $currentFileOffer.files.length > previewFileLimit}
            <button class="btn btn-neutral btn-sm absolute bottom-40 left-1/2 z-10 -translate-x-1/2 shadow-lg" aria-controls="offered-files" aria-expanded={showAllFiles} onclick={() => showAllFiles = !showAllFiles}>
                {#if showAllFiles}
                    <ChevronUpIcon class="h-4 w-4"/>
                    Show less
                {:else}
                    <ChevronDownIcon class="h-4 w-4"/>
                    Show {$currentFileOffer.files.length - previewFileLimit} more file{$currentFileOffer.files.length - previewFileLimit === 1 ? "" : "s"}
                {/if}
            </button>
        {/if}
        {#if $currentFileOffer}
            <div class="flex shrink-0 items-center justify-between rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/70">
                <span>Total files: {$currentFileOffer.files.length}</span>
                <span>Total size: {formatFileSize($currentFileOffer.files.reduce((total, file) => total + file.size, 0))}</span>
            </div>
        {/if}
        <div class="flex shrink-0 flex-col gap-3">
            {#if $downloadFinished}
                <a href="/donate" class="btn btn-primary w-full">
                    <HeartIcon class="h-5 w-5"/>
                    Donate
                </a>
            {:else}
                <button disabled={!$isConnected || !$currentFileOffer} onclick={acceptFiles} class="btn btn-neutral w-full">
                    <DownloadIcon class="h-5 w-5"/>
                    Start download
                </button>
            {/if}
        </div>
    </div>
</div>
