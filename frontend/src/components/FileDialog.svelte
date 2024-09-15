<script lang="ts">
    import {type FileOffer} from "../types/file.ts";
    import {onMount} from "svelte";
    import {acceptIncomingFileOffer, currentFileOffer, denyIncomingFileOffer} from "../lib/file.ts";
    import {findUserById} from "../lib/socket.ts";
    import type {User} from "../types/user.ts";
    import {FileAudioIcon, FileIcon, FileVideoIcon, ImageIcon, ShareIcon} from "lucide-svelte";
    import {formatFileSize} from "../util/filesize.ts";

    let user: User | undefined;
    let offer: FileOffer | null;

    onMount(() => {
        currentFileOffer.subscribe(value => {
            console.log('Received file offer:', value)
            if (value == null) return
            offer = value
            user = findUserById(value.from)

            showFileDialog()
        })
    })

    function showFileDialog() {
        let fileDialog = document.getElementById("file-dialog") as HTMLDialogElement
        fileDialog.showModal()
    }

    function closeFileDialog() {
        let fileDialog = document.getElementById("file-dialog") as HTMLDialogElement
        fileDialog.close()
    }

    function acceptFiles() {
        console.log('Accepted files:', offer?.files)
        acceptIncomingFileOffer()
        closeFileDialog()
    }

    function denyFiles() {
        console.log('Denied files:', offer?.files)
        denyIncomingFileOffer()
        closeFileDialog()
    }
</script>

<dialog class="modal px-2 sm:px-0" id="file-dialog" aria-labelledby="modal-title" aria-describedby="modal-description">
    <div class="modal-box w-full max-w-md flex flex-col gap-3 space-y-6">
        <div class="flex items-center space-x-4">
            <div class="bg-gray-100 p-2 rounded-full">
                <ShareIcon class="h-6 w-6"/>
            </div>
            <div>
                <p class="text-2xl sm:text-3xl font-bold modal-title">File transfer request</p>
                <p class="text-gray-500 modal-description">{user?.display_name} wants to send you files</p>
            </div>
        </div>
        <div>
            {#if offer}
                <ul class="space-y-2">
                    {#each offer.files as file}
                        <li class="flex items-center justify-between py-2">
                            <div class="flex items-center space-x-3">
                                {#if file.mime.startsWith("image/")}<ImageIcon class="h-5 w-5"/>{/if}
                                {#if file.mime.startsWith("audio/")}<FileAudioIcon class="h-5 w-5"/>{/if}
                                {#if file.mime.startsWith("video/")}<FileVideoIcon class="h-5 w-5"/>{/if}
                                {#if !file.mime.startsWith("image/") && !file.mime.startsWith("audio/") && !file.mime.startsWith("video/")}<FileIcon class="h-5 w-5"/>{/if}
                                <span class="font-medium">{file.name}</span>
                            </div>
                            <span class="text-gray-500 text-sm">{formatFileSize(file.size)}</span>
                        </li>
                    {/each}
                </ul>
                <div class="mt-4">
                    <span class="text-gray-500">Total size: {formatFileSize(offer.files.reduce((acc, file) => acc + file.size, 0))}</span>
                </div>
            {/if}
        </div>
        <div class="flex justify-between">
            <button on:click={denyFiles} class="btn btn-outline">Deny Files</button>
            <button on:click={acceptFiles} class="btn btn-primary">Accept Files</button>
        </div>
    </div>
</dialog>