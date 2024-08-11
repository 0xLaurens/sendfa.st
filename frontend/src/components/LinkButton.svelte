<script lang="ts">
    import {Link} from "lucide-svelte"

    function CopyToClipboard() {
        navigator.clipboard.writeText(window.location.href)
    }
</script>

<!--TODO: add toast to let the user know they copied the text-->
<div class="tooltip tooltip-bottom" data-tip="Copy the link">
    <button on:click={CopyToClipboard} class="btn btn-sm">
        <Link/>
        Link
    </button>
</div>
