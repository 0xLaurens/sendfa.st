<script lang="ts">
    import {Link, Share2Icon, ShareIcon} from "lucide-svelte"
    import {addToast} from "../lib/toast.ts"
    import type {ToastData} from "../types/toast.ts";

    export let link: string = ""

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

<div class="tooltip tooltip-bottom" data-tip="Copy the link">
    <button on:click={ShareLink} class="btn btn-square bg-base-100">
        <Share2Icon />
    </button>
</div>
