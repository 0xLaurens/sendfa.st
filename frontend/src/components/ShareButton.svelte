<script lang="ts">
    import {Share2Icon} from "lucide-svelte";
    import {addToast} from "../lib/toast.ts";

    interface Props {
        link?: string;
    }

    let {link}: Props = $props();

    async function shareLink() {
        if (!link) return;
        const url = link;
        if (navigator.share) {
            try {
                await navigator.share({title: "Share the link", url});
                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return;
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            addToast({id: Date.now(), type: "success", title: "Copied to clipboard", description: "The sharing link is ready to paste."});
        } catch {
            addToast({id: Date.now(), type: "error", title: "Could not copy the link", description: "Select the link to copy it manually."});
        }
    }
</script>

<div class="tooltip tooltip-bottom" data-tip="Share link">
    <button type="button" disabled={!link} onclick={shareLink} aria-label="Share link" class="btn btn-square bg-base-100">
        <Share2Icon/>
    </button>
</div>
