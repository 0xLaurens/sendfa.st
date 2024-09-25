<script lang="ts">
    import {LinkIcon, QrCodeIcon, UploadIcon, XIcon} from "lucide-svelte";
    import type {ToastData} from "../types/toast.ts";
    import {addToast} from "../lib/toast.ts";
    import {formatFileSize} from "../util/filesize.js";
    import QrButton from "./QrButton.svelte";
    import LinkButton from "./LinkButton.svelte";

    let filesToSend: FileList | null = null;
    let link: string = "https://sendfa.st/r/14724459-9db4-4128-be1a-e15b372716b4";

    function handleFiles(event: any): void {
        const files = (event.target as HTMLInputElement).files;
        if (files || files) {
            handleFilesSelected(files);
        }
    }

    function handleFilesSelected(files: FileList) {
        if (!files) return
        console.log('Selected files:', files);
        filesToSend = files;
        const toast: ToastData = {
            type: "success",
            id: Date.now(),
            title: "Files selected",
            duration: 5000,
            description: `You have selected ${files.length} files to send.`,
        }
        addToast(toast);
    }

    function cancelUpload() {
        filesToSend = null;
    }
</script>

<div class="hidden sm:flex flex-col max-w-md">
    <label for="files"
           class="card card-bordered card-compact bg-base-100 min-w-md min-h-96 w-96 transition-transform duration-200" class:hover:scale-105={!filesToSend}>
        <div class="card-body flex items-center justify-center gap-8 w-full">
            {#if !filesToSend}
                <div>
                    <UploadIcon class="h-16 w-16"/>
                </div>
                <div class="space-y-4">
                    <label for="files" class="btn btn-primary btn-wide shadow-xl">Upload file(s)</label>
                    <p class="font-semibold">Or drop file(s)</p>
                </div>
            {/if}
            {#if filesToSend}
                <div class="flex flex-col gap-16">
                    <div class="text-left">
                        {#if filesToSend.length > 1}
                            <h2 class="text-xl font-semibold">Multiple files ({filesToSend.length})</h2>
                        {:else}
                            <h2 class="text-xl font-semibold">{filesToSend.item(0)?.name}</h2>
                        {/if}
                        <p>
                            Total size: {formatFileSize(Array.from(filesToSend).reduce((total, file) => total + file.size, 0))}</p>
                        <div class="flex flex-row gap-2 items-center justify-center pt-5">
                            <input class="input input-bordered"
                                   value="https://sendfa.st/r/14724459-9db4-4128-be1a-e15b372716b4">
                            <QrButton {link} />
                            <LinkButton {link} />
                        </div>
                        <p class="text-wrap pt-2">
                            Share the link or scan the QR code to start downloading the file on another device.
                        </p>
                    </div>
                    <div class="flex flex-col gap-3">
                        <label  for="files" class="btn btn-neutral w-full">
                            <UploadIcon class="h-5 w-5"/>
                            Change upload
                        </label>
                        <input on:change={handleFiles} class="hidden" id="files" type="file"/>
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