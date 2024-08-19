<script lang="ts">
    let user = "Alice";
    let files = {
        length: 2
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

<button class="btn btn-neutral btn-sm" on:click={showFileDialog}>File dialog</button>
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
            <div class="flex flex-col gap-3">
                <div class="flex justify-between">
                    <p>File 1</p>
                    <p>1.2 MB</p>
                </div>
                <div class="flex justify-between">
                    <p>File 2</p>
                    <p>3.4 MB</p>
                </div>
                <div class="flex justify-between">
                    <p>File 3</p>
                    <p>5.6 MB</p>
                </div>
            </div>
        </div>

        <div class="divider"></div>
        <div class="flex justify-between gap-4">
            <button class="btn btn-outline btn-sm w-48" on:click={denyFiles}>Deny</button>
            <button class="btn btn-primary btn-sm w-48" on:click={acceptFiles}>Accept</button>
        </div>
    </div>
</dialog>