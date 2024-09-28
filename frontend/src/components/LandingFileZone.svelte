<script lang="ts">
    import {ShareIcon, UploadIcon, X, XIcon} from "lucide-svelte";
    import type {ToastData} from "../types/toast.ts";
    import {addToast} from "../lib/toast.ts";
    import {formatFileSize} from "../util/filesize.js";
    import QrButton from "./QrButton.svelte";
    import LinkButton from "./LinkButton.svelte";
    import WebsocketManager, {roomId} from "../lib/socket.ts";
    import {onDestroy, onMount} from "svelte";
    import {filesUploaded} from "../lib/file.ts";
    import {truncateFileName} from "../util/truncate.ts";
    import {qr} from "@svelte-put/qr/svg"
    import ShareButton from "./ShareButton.svelte";

    let filesToSend: FileList | null = null;
    let link: string = "dummy.com";
    let isDragging: boolean = false;
    let debounceTimer: ReturnType<typeof setTimeout>;
    let manager: WebsocketManager;

    onMount(() => {
        manager = new WebsocketManager("ws://localhost:7331/api/websocket");
        roomId.listen(value => {
            if (value == null) return;
            console.log("Setting room code to", value);
            link = `${window.location.href}r/${value}`;
        })
    })

    onDestroy(() => {
        manager.close();
    })

    function handleFiles(event: any): void {
        const files = (event.target as HTMLInputElement).files;
        if (files || files) {
            handleFilesSelected(files);
        }
    }

    function handleFilesSelected(files: FileList) {
        if (!files || files.length === 0) return
        console.log('Selected files:', files);
        filesToSend = files;
        filesUploaded.set(files);
        const toast: ToastData = {
            type: "success",
            id: Date.now(),
            title: "Files selected",
            duration: 5000,
            description: `You have selected ${files.length} files to send.`,
        }
        manager.connect();
        addToast(toast);
    }

    function cancelUpload() {
        setTimeout(() => {
            filesToSend = null;
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
        const files = event.dataTransfer?.files;
        if (files) {
            handleFilesSelected(files);
        }
    }
</script>


<svelte:window
        class="z-50 h-screen w-screen absolute bg-red-500"
        on:dragenter={handleDragEnter}
        on:dragleave={handleDragLeave}
        on:dragover={handleDragOver}
        on:drop={handleDrop}
/>

{#if isDragging && !filesToSend}
    <div class="fixed inset-0 bg-primary bg-opacity-75 z-50 flex items-center justify-center"
         on:click={() => {setDragging(false)}}
         role="button"
         tabindex="0"
         on:keydown={(e) => {if (e.key === "Escape") setDragging(false)}}
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

<div class="hidden sm:flex flex-col max-w-md">
    <label for="files"
           class="card card-bordered card-compact bg-base-100 min-w-md min-h-96 w-96 transition-transform duration-200"
           class:hover:scale-105={!filesToSend}>
        <div class="card-body flex items-center justify-center gap-8 w-full">
            {#if !filesToSend || filesToSend.length === 0}
                <div>
                    <UploadIcon class="h-16 w-16"/>
                </div>
                <div class="space-y-4">
                    <label for="files" class="btn btn-primary btn-wide shadow-xl">Upload file(s)</label>
                    <p class="font-semibold">Or drop file(s)</p>
                </div>
            {/if}
            {#if filesToSend && filesToSend.length > 0}
                <div class="flex flex-col gap-16">
                    <div class="text-left">
                        {#if filesToSend.length > 1}
                            <h2 class="text-xl font-semibold">Multiple files ({filesToSend.length})</h2>
                        {:else}
                            <h2 class="text-xl font-semibold text-wrap">{truncateFileName(filesToSend.item(0)?.name)}</h2>
                        {/if}
                        <p>
                            Total
                            size: {formatFileSize(Array.from(filesToSend).reduce((total, file) => total + file.size, 0))}</p>
                        <div class="flex flex-row gap-2 items-center justify-center pt-5">
                            <input class="input input-bordered"
                                   value="{link}">
                            <QrButton {link}/>
                            <LinkButton {link}/>
                        </div>
                        <p class="text-wrap pt-3 font-bold">Make sure to keep this page open whilst sending!</p>
                        <p class="text-wrap pt-2">
                            Share the link or scan the QR code to start downloading the file on another device.
                        </p>
                    </div>
                    <div class="flex flex-col gap-3">
                        <label for="change-files" class="btn btn-neutral w-full">
                            <UploadIcon class="h-5 w-5"/>
                            Change upload
                        </label>
                        <input on:change={handleFiles} class="hidden" id="change-files" type="file" multiple/>
                        <button on:click={cancelUpload} class="btn w-full">
                            <XIcon class="h-5 w-5"/>
                            Cancel upload
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </label>
</div>
<div class="flex sm:hidden flex-col">
    <label for="files" class="btn btn-primary btn-wide">
        <UploadIcon/>
        Upload file(s)
    </label>
    <input on:change={handleFiles} class="hidden" id="files" type="file"
           disabled="{filesToSend && filesToSend?.length > 0}" multiple>
</div>
{#if filesToSend && filesToSend.length > 0}
    <div class="modal modal-open flex sm:hidden justify-center content-center z-50">
        <div class="modal-box card card-bordered card-compact bg-base-100">
            <button class="self-end" on:click={cancelUpload} aria-label="close menu and cancel">
                <XIcon class="h-5 w-5"/>
            </button>
            <div class="flex flex-col gap-6">
                <div class="text-left">
                    {#if filesToSend.length > 1}
                        <h2 class="text-xl font-semibold">Multiple files ({filesToSend.length})</h2>
                    {:else}
                        <h2 class="text-xl font-semibold text-wrap">{truncateFileName(filesToSend.item(0)?.name)}</h2>
                    {/if}
                    <p>
                        Total
                        size: {formatFileSize(Array.from(filesToSend).reduce((total, file) => total + file.size, 0))}</p>
                    <div class="flex flex-row gap-2 items-center justify-center pt-5">
                        <input class="input input-bordered w-3/4"
                               value="{link}">
                        <ShareButton {link}/>
                    </div>
                    <p class="text-wrap pt-3 font-bold">Make sure to keep this page open whilst sending!</p>
                    <p class="text-wrap pt-2">
                        Share the link or scan the QR code to start downloading the file on another device.
                    </p>
                    <svg class="h-32 w-32 mx-auto" use:qr="{{ data: link }}" />
                </div>
                <div class="flex flex-col gap-3">
                    <label for="change-files" class="btn btn-neutral w-full">
                        <UploadIcon class="h-5 w-5"/>
                        Change upload
                    </label>
                    <input on:change={handleFiles} class="hidden" id="change-files" type="file" multiple/>
                    <button on:click={cancelUpload} class="btn w-full">
                        <XIcon class="h-5 w-5"/>
                        Cancel upload
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}