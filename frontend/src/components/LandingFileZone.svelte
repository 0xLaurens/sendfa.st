<script lang="ts">
    import {UploadIcon, XIcon} from "lucide-svelte";
    import type {ToastData} from "../types/toast.ts";
    import {addToast} from "../lib/toast.ts";
    import {formatFileSize} from "../util/filesize.js";
    import WebsocketManager, {admittedRoomPath, connectionError, connectionNotice, roomAdmitted, sendCancelDownload} from "../lib/socket.ts";
    import {onMount} from "svelte";
    import {filesUploaded} from "../lib/file.ts";
    import {truncateFileName} from "../util/truncate.ts";
    import {qr} from "@svelte-put/qr/svg"
    import ShareButton from "./ShareButton.svelte";

    let fileInput: HTMLInputElement;
    let origin = $state("");
    let link = $derived($admittedRoomPath && origin ? origin + $admittedRoomPath : undefined);
    let connecting = $derived(!link && !$connectionError);
    let isDragging = $state(false);
    let debounceTimer: ReturnType<typeof setTimeout>;
    let manager: WebsocketManager;

    onMount(() => {
        origin = window.location.origin;
        manager = new WebsocketManager(`${import.meta.env.PUBLIC_WS_PROTOCOL}://${import.meta.env.PUBLIC_WS_HOST}/api/websocket`, true);
        return () => manager.close();
    });

    function handleFilesSelected(files: FileList | null | undefined) {
        if (!files?.length) return;
        filesUploaded.set(Array.from(files));
        if (!$roomAdmitted) manager.connect();
        const toast: ToastData = {
            type: "success",
            id: Date.now(),
            title: "Files selected",
            description: `You have selected ${files.length} files to send.`,
        };
        addToast(toast);
    }

    function cancelUpload() {
        setTimeout(() => {
            sendCancelDownload(manager.getWebSocket());
            filesUploaded.set(null);
            manager.close();
        }, 100)
    }

    let dragCounter: number = 0;

    function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
        return (...args: Parameters<T>) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func(...args), delay);
        };
    }

    const setDragging = debounce((value: boolean) => {
        isDragging = value;
    }, 100);

    function handleDragEnter(event: DragEvent): void {
        event.preventDefault();
        dragCounter++;
        setDragging(true);
    }

    function handleDragLeave(event: DragEvent): void {
        event.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            setDragging(false);
        }
    }

    function handleDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    function handleDrop(event: DragEvent): void {
        event.preventDefault();
        dragCounter = 0;
        setDragging(false);
        handleFilesSelected(event.dataTransfer?.files);
    }
</script>


<svelte:window
        ondragenter={handleDragEnter}
        ondragleave={handleDragLeave}
        ondragover={handleDragOver}
        ondrop={handleDrop}
/>

{#if isDragging && !$filesUploaded}
    <div class="absolute z-50 h-screen w-screen bg-red-500 flex items-center justify-center"
         onclick={() => {setDragging(false)}}
         role="button"
         tabindex="0"
         onkeydown={(e) => {if (e.key === "Escape") setDragging(false)}}
    >
        <div class="relative w-full h-full max-w-[85vw] max-h-[85vh] m-8">
            <!-- Top-left corner -->
            <div class="absolute top-0 left-0 w-16 h-16 border-t-[16px] border-l-[16px] border-white rounded-tl-3xl"></div>
            <!-- Top-right corner -->
            <div class="absolute top-0 right-0 w-16 h-16 border-t-[16px] border-r-[16px] border-white rounded-tr-3xl"></div>
            <!-- Bottom-left corner -->
            <div class="absolute bottom-0 left-0 w-16 h-16 border-b-[16px] border-l-[16px] border-white rounded-bl-3xl"></div>
            <!-- Bottom-right corner -->
            <div class="absolute bottom-0 right-0 w-16 h-16 border-b-[16px] border-r-[16px] border-white rounded-br-3xl"></div>

            <div class="flex items-center justify-center h-full">
                <h3 class="text-4xl lg:text-6xl  font-black text-white text-center">Drop files anywhere.</h3>
            </div>
        </div>
    </div>
{/if}

<div class="w-full max-w-sm shrink-0">
    <input bind:this={fileInput} onchange={() => {
        handleFilesSelected(fileInput.files);
        fileInput.value = "";
    }} class="hidden" type="file" multiple>

    {#if $filesUploaded}
        <div class="card card-bordered card-compact bg-base-100">
            <div class="card-body gap-4 text-left">
                <div>
                    <h2 class="text-xl font-semibold text-wrap">
                        {$filesUploaded.length > 1
                            ? `Multiple files (${$filesUploaded.length})`
                            : truncateFileName($filesUploaded[0].name)}
                    </h2>
                    <p>Total size: {formatFileSize($filesUploaded.reduce((total, file) => total + file.size, 0))}</p>
                </div>
                <div class="flex items-center gap-2">
                    <input aria-label="Sharing link" class="input input-bordered min-w-0 flex-1"
                           class:animate-pulse={connecting} readonly disabled={!link}
                           value={link ?? (connecting ? "Connecting..." : "")}>
                    <ShareButton {link}/>
                </div>
                {#if link}
                    <svg aria-label="Sharing link QR code" role="img" class="h-32 w-32 self-center" use:qr={{data: link}}/>
                {/if}
                <p class="font-bold">Keep this page open while sending.</p>
                {#if $connectionError}<p class="text-error">{$connectionError}</p>{/if}
                {#if $connectionNotice}<p role="status">{$connectionNotice}</p>{/if}
                <button type="button" onclick={() => fileInput.click()} class="btn btn-neutral w-full">
                    <UploadIcon class="h-5 w-5"/>
                    Change upload
                </button>
                <button type="button" onclick={cancelUpload} class="btn w-full">
                    <XIcon class="h-5 w-5"/>
                    Cancel upload
                </button>
            </div>
        </div>
    {:else}
        <button type="button" onclick={() => fileInput.click()}
                class="btn max-sm:btn-primary sm:card sm:card-bordered sm:flex-col sm:min-h-96 sm:w-full sm:justify-center sm:gap-6
                       sm:bg-base-100 sm:text-base-content sm:hover:bg-base-100 sm:hover:scale-105">
            <UploadIcon class="h-5 w-5 sm:h-16 sm:w-16"/>
            <span class="sm:btn sm:btn-primary">Upload file(s)</span>
            <span class="hidden sm:block">Or drop file(s)</span>
        </button>
    {/if}
</div>
