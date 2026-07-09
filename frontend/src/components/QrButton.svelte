<script lang="ts">
    import {qr} from "@svelte-put/qr/svg"
    import {QrCode} from "lucide-svelte";

    interface Props {
        link: string;
        disabled?: boolean;
    }

    let { link, disabled = false }: Props = $props();

    function showModal() {
        let qr = document.getElementById("qr") as HTMLDialogElement
        qr.showModal()
    }
</script>
<div class="tooltip tooltip-bottom" data-tip="Show QR code">
    <button disabled="{disabled}" class="btn btn-square bg-base-100" onclick={showModal}>
        <QrCode/>
    </button>
</div>
<dialog class="modal" id="qr" aria-labelledby="modal-title" aria-describedby="modal-description">
    <div class="modal-box w-auto text-center flex flex-col gap-3">
        <form method="dialog">
            <button
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    aria-label="Close dialog">
                ✕
            </button>
        </form>

        <p id="modal-title" class="text-2xl font-semibold">
            Scan the QR
        </p>

        <div id="modal-description">
            <div>
                <svg class="h-56 w-56" use:qr="{{ data: link }}">
                </svg>
            </div>
            <p class="w-56 text-wrap text-center">
                Scan the QR code to start downloading the file that device.
            </p>
        </div>
    </div>

    <form method="dialog" class="modal-backdrop">
        <button aria-label="Close dialog">Close</button>
    </form>
</dialog>