<script lang="ts" context="module">
    import toasts from "../lib/toast.ts";

    export type ToastData = {
        id: number
        type: "success" | "error"
        title: string
        description: string
    }

</script>
<script>
    import CheckmarkIcon from "./CheckmarkIcon.svelte";
    import ErrorIcon from "./ErrorIcon.svelte";
</script>

<div class="flex justify-center items-center">
    <div class="fixed top-0 left-0 right-0 flex justify-center items-start p-4 z-50"
         role="alert"
         aria-live="assertive"
         aria-atomic="true"
    >
        {#each $toasts as toast (toast.id)}
            <div class="card card-compact card-bordered z-10 bg-base-100 shadow-xl w-96 transition-popup">
                <div class="card-body flex flex-row">
                    <div class="my-auto px-2">
                        {#if toast.type === "success"}
                            <CheckmarkIcon/>
                        {/if}
                        {#if toast.type === "error"}
                            <ErrorIcon/>
                        {/if}
                    </div>
                    <div>
                        <div>
                            <h3 class="font-bold text-lg">
                                {toast.title}
                            </h3>
                            <div>
                                {toast.description}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/each}
    </div>
</div>
