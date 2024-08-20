<script lang="ts">
    import {File, FileImage, FileMusic, FileVideo} from "lucide-svelte";
    import type {FileMessage} from "../types/file.ts";
    import {formatFileSize} from "../util/filesize.ts";

    export let file: FileMessage;
</script>

<div class="card card-compact">
    <div class="card-body flex flex-row justify-between">
        <!-- file icon-->
        <div class="flex justify-center text-center">
            {#if file.mime.startsWith("image/")}
                <FileImage class="w-12 h-12"/>
            {/if}
            {#if file.mime.startsWith("audio/")}
                <FileMusic class="w-12 h-12"/>
            {/if}
            {#if file.mime.startsWith("video/")}
                <FileVideo class="w-12 h-12"/>
            {/if}
            {#if !file.mime.startsWith("image/") && !file.mime.startsWith("audio/") && !file.mime.startsWith("video/")}
                <File class="w-12 h-12"/>
            {/if}
            <p class="mx-auto my-auto font-semibold">{file.name}</p>
        </div>
        <div class="flex justify-center">
            <p class="my-auto">
                {formatFileSize(file.size)}
            </p>
        </div>
    </div>
</div>