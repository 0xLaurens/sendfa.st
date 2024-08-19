<script>
    import {FileImage} from "lucide-svelte";
</script>

<div class="card card-compact">
    <div class="card-body flex flex-row justify-between">
        <!-- file icon-->
        <div class="flex justify-center text-center">
            <FileImage class="mx-1" />
            <p class="mx-auto my-auto font-semibold">cool-cat.jpg</p>
        </div>
        <div class="flex justify-center">
            <p class="my-auto">
                10.2 MB
            </p>
        </div>
    </div>
</div>