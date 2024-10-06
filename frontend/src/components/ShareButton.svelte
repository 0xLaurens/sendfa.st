<script lang="ts">
    import {Share2Icon} from "lucide-svelte"
    import {addToast} from "../lib/toast.ts"
    import type {ToastData} from "../types/toast.ts";

    export let link: string = ""
    export let disabled: boolean = false

    function ShareLink() {
        if (!navigator.share) {
            console.error("Web Share API not supported")
            CopyToClipboard()
            return
        }
        navigator.share({
            title: "Share the link",
            text: "Share the link with your friends",
            url: link,
        })
    }

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

<div class="tooltip tooltip-bottom" data-tip="Share link">
    <button disabled="{disabled}" on:click={ShareLink} class="btn btn-square bg-base-100">
        <Share2Icon/>
    </button>
</div>
