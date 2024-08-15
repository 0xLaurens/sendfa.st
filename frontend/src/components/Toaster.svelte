<script lang="ts" context="module">
    import toasts from "../lib/toast.ts";
    import {closeToast} from "../lib/toast.ts";

    export type ToastData = {
        id: number
        title: string
        description: string
        color: string
    }
    let toast_data: ToastData[] = []

</script>

{#each $toasts as toast (toast.id)}
    <div>
        <div>
            <div>
                <h3>
                    {toast.title}
                </h3>
                <div>
                    {toast.description}
                </div>
            </div>
            <button on:click={() => closeToast(toast.id)} aria-label="close notification"> X</button>
        </div>
    </div>
{/each}