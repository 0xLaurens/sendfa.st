<script lang="ts">
    import {SettingsIcon} from "lucide-svelte";
</script>

<header class="z-10 relative bg-transparent">
    <nav class="container max-w-5xl flex items-center justify-between px-8 py-4 mx-auto" aria-label="Global">
        <div></div>
        <div></div>
        <div class="flex justify-end flex-1 space-x-3">
            <a class="btn btn-sm btn-primary" href={import.meta.env.SENDFAST_PRO_URL}>
                Go Pro
            </a>
            <button class="btn btn-neutral btn-sm btn-circle">
                <SettingsIcon class="h-5 w-5 text-white"/>
            </button>
        </div>
    </nav>
</header>

<dialog class="modal px-2 sm:px-0" id="file-dialog" aria-labelledby="modal-title" aria-describedby="modal-description">
    <div class="modal-box w-full max-w-md flex flex-col gap-3 space-y-6">
        <div class="flex items-center space-x-4">
            <div class="bg-gray-100 p-2 rounded-full">
                <SettingsIcon class="h-6 w-6"/>
            </div>
            <div>
                <p class="text-2xl sm:text-3xl font-bold modal-title">File transfer request</p>
                <p class="text-gray-500 modal-description"></p>
            </div>
        </div>
        <div>
        </div>
        <div class="flex justify-between">
            <button class="btn btn-outline">Deny Files</button>
            <button class="btn btn-primary">Accept Files</button>
        </div>
    </div>
</dialog>
