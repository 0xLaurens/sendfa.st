<script lang="ts">
    import {qr} from "@svelte-put/qr/svg"
    import {QrCode} from "lucide-svelte";

    export let code: string;

    function showModal() {
        let qr = document.getElementById("qr") as HTMLDialogElement
        qr.showModal()
    }
</script>
<div class="tooltip tooltip-bottom" data-tip="Show QR code">
    <button class="btn btn-sm" on:click={showModal}>
        <QrCode/>
        QR
    </button>
</div>
<dialog class="modal" id="qr">
    <div class="modal-box w-auto text-center flex flex-col gap-3">
        <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <p class="text-2xl font-semibold">Room code: <span class="font-black">{code}</span></p>
        <div>
            <div>
                <svg
                        class="h-56 w-56"
                        use:qr={{
                                data: `${window.location.href}`
                            }}
                >
                </svg>
            </div>
            <p class="w-56 text-wrap text-center">Scan the QR code to connect your device.</p>
        </div>
    </div>
    <form method="dialog" class="modal-backdrop">
        <button>Close</button>
    </form>
</dialog>