<script lang="ts">
    import {onMount} from "svelte";
    import toasts, {triggerTimeouts} from "../../lib/toast.ts";
    import CheckmarkIcon from "./CheckmarkIcon.svelte";
    import ErrorIcon from "./ErrorIcon.svelte";

    onMount(() => {
        triggerTimeouts();
    })
</script>

<div class="toast toast-top toast-center sm:toast-end z-50 w-full sm:w-auto">
    {#each $toasts as toast (toast.id)}
        <div class="card card-compact card-bordered bg-base-100 shadow-xl w-full sm:w-96 transition-popup">
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
