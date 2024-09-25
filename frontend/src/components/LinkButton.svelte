<script lang="ts">
    import {Link} from "lucide-svelte"
    import {addToast} from "../lib/toast.ts"
    import type {ToastData} from "../types/toast.ts";

    export let link: string = ""

    function CopyToClipboard() {
        navigator.clipboard.writeText(link)
        console.log("Copied to clipboard")
        const toast: ToastData = {
            id: Date.now(),
            type: "success",
            title: "Copied to clipboard",
            description: "The link has been copied to your clipboard",
        }
        addToast(toast)
    }
</script>

<div class="tooltip tooltip-bottom" data-tip="Copy the link">
    <button on:click={CopyToClipboard} class="btn btn-square bg-base-100">
        <Link/>
    </button>
</div>
