<script lang="ts">
    import FileItem from "./FileItem.svelte";

    let user = "Alice";
    let files = {
        length: 3
    }

    function showFileDialog() {
        let fileDialog = document.getElementById("file-dialog") as HTMLDialogElement
        fileDialog.showModal()
    }

    function closeFileDialog() {
        let fileDialog = document.getElementById("file-dialog") as HTMLDialogElement
        fileDialog.close()
    }

    function acceptFiles() {
        console.log('Accepted files:', files)
        closeFileDialog()
    }

    function denyFiles() {
        console.log('Denied files:', files)
        closeFileDialog()
    }
</script>

<dialog class="modal" id="file-dialog" aria-labelledby="modal-title" aria-describedby="modal-description">
    <div class="modal-box w-auto text-center flex flex-col gap-3">
        <form method="dialog">
            <button
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    aria-label="Close dialog">
                ✕
            </button>
        </form>

        <p id="modal-title" class="text-2xl font-semibold">
            <span class="font-black">{user}</span> would like to send you {files.length} {files.length === 1 ? 'file' : 'files'}
        </p>

        <div id="modal-description">
            <FileItem />
            <FileItem />
            <FileItem />
        </div>

        <div class="divider"></div>
        <div class="flex justify-between gap-4">
            <button class="btn btn-outline btn-sm w-48" on:click={denyFiles}>Deny</button>
            <button class="btn btn-primary btn-sm w-48" on:click={acceptFiles}>Accept</button>
        </div>
    </div>
</dialog>