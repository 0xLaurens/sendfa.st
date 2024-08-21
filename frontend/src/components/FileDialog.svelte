<script lang="ts">
    import FileItem from "./FileItem.svelte";
    import type {FileOffer} from "../types/file.ts";
    import {onMount} from "svelte";
    import {acceptIncomingFileOffer, currentFileOffer, denyIncomingFileOffer} from "../lib/file.ts";
    import {findUserById, users} from "../lib/socket.ts";
    import type {User} from "../types/user.ts";

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

<dialog class="modal" id="file-dialog" aria-labelledby="modal-title" aria-describedby="modal-description">
    <div class="modal-box w-auto text-center flex flex-col gap-3">
        <form method="dialog">
            <button
                    on:click={denyIncomingFileOffer}
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    aria-label="Close dialog">
                ✕
            </button>
        </form>

        <p id="modal-title" class="text-2xl font-semibold">
            <span class="font-black">{user?.display_name}</span> would like to send
            you {offer?.files.length} {offer?.files.length === 1 ? 'file' : 'files'}
        </p>

        <div id="modal-description">
            {#if offer}
                {#each offer.files as file}
                    <FileItem file={file}/>
                {/each}
            {/if}
        </div>

        <div class="divider"></div>
        <div class="flex justify-between gap-4">
            <button class="btn btn-outline btn-sm w-48" on:click={denyFiles}>Deny</button>
            <button class="btn btn-primary btn-sm w-48" on:click={acceptFiles}>Accept</button>
        </div>
    </div>
</dialog>