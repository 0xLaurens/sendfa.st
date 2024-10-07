<script lang="ts">
    import {CheckIcon, CopyIcon} from "lucide-svelte";
    import type {ToastData} from "../types/toast.ts";
    import {addToast} from "../lib/toast.ts";

    export let contentToCopy: string = "";
    export let tooltip: string = "Copy to clipboard";
    export let subject: string = "content"

    let hasCopied = false;
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
    <button on:click={onCopy} class="btn btn-sm btn-outline btn-square">
        {#if hasCopied}
            <CheckIcon class="h-4 w-4"/>
        {:else}
            <CopyIcon class="h-4 w-4"/>
        {/if}
    </button>

</div>
