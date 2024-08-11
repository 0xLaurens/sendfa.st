<script lang="ts">
    import {FileUp} from "lucide-svelte";

</script>

<label for="files" class="btn btn-sm">
    <FileUp/>
    File(s)
</label>
<input class="hidden" id="files" type="file">