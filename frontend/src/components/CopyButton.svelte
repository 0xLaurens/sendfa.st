<script lang="ts">
    import {CheckIcon, CopyIcon} from "lucide-svelte";
    import type {ToastData} from "../types/toast.ts";
    import {addToast} from "../lib/toast.ts";

    interface Props {
        contentToCopy?: string;
        tooltip?: string;
        subject?: string;
    }

    let { contentToCopy = "", tooltip = "Copy to clipboard", subject = "content" }: Props = $props();

    let hasCopied = $state(false);
    function onCopy() {

        const toast: ToastData = {
            id: Date.now(),
            type: "success",
            title: "Copied to clipboard",
            description: `The ${subject} has been copied!`,
        }
        navigator.clipboard.writeText(contentToCopy).then(() => {
            hasCopied = true;
            addToast(toast)
            setTimeout(() => {
                hasCopied = false;
            }, 1500);
        });
    }

</script>

<div class="tooltip tooltip-bottom" data-tip="{tooltip}">
    <button onclick={onCopy} class="btn btn-sm btn-outline btn-square">
        {#if hasCopied}
            <CheckIcon class="h-4 w-4"/>
        {:else}
            <CopyIcon class="h-4 w-4"/>
        {/if}
    </button>

</div>
