<script lang="ts">
    import {onMount} from 'svelte';
    import {addToast} from "../lib/toast.ts";
    import type {ToastData} from "../types/toast.ts";
    import {filesUploaded} from "../lib/file.ts";

    let isDragging: boolean = false;
    let dragCounter: number = 0;
    let debounceTimer: ReturnType<typeof setTimeout>;

    function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
        return (...args: Parameters<T>) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func(...args), delay);
        };
    }

    const setDragging = debounce((value: boolean) => {
        isDragging = value;
    }, 100);

    function handleDragEnter(event: DragEvent): void {
        event.preventDefault();
        dragCounter++;
        setDragging(true);
    }

    function handleDragLeave(event: DragEvent): void {
        event.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            setDragging(false);
        }
    }

    function handleDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    function handleDrop(event: DragEvent): void {
        event.preventDefault();
        dragCounter = 0;
        setDragging(false);
        const files = event.dataTransfer?.files;
        if (files) {
            handleFilesSelected(files);
        }
    }

    function handleFilesSelected(files: FileList) {
        if (!files) return
        console.log('Selected files:', files);
        const toast: ToastData = {
            type: "success",
            id: Date.now(),
            title: "Files selected",
            duration: 5000,
            description: `You have selected ${files.length} files to send. Press on the user(s) to send the files to them.`,
        }
        filesUploaded.set(files);
        addToast(toast);
    }

    onMount(() => {
        return () => {
            clearTimeout(debounceTimer);
        };
    });
</script>

<svelte:window
        class="z-50 w-scree h-screen"
        on:dragenter={handleDragEnter}
        on:dragleave={handleDragLeave}
        on:dragover={handleDragOver}
        on:drop={handleDrop}
/>

{#if isDragging}
    <div class="fixed inset-0 bg-primary bg-opacity-75 z-50 flex items-center justify-center"
         on:click={() => {setDragging(false)}}
         role="button"
         tabindex="0"
         on:keydown={(e) => {if (e.key === "Escape") setDragging(false)}}
    >
        <div class="relative w-full h-full max-w-[85vw] max-h-[85vh] m-8">
            <!-- Top-left corner -->
            <div class="absolute top-0 left-0 w-16 h-16 border-t-[16px] border-l-[16px] border-white rounded-tl-3xl"></div>
            <!-- Top-right corner -->
            <div class="absolute top-0 right-0 w-16 h-16 border-t-[16px] border-r-[16px] border-white rounded-tr-3xl"></div>
            <!-- Bottom-left corner -->
            <div class="absolute bottom-0 left-0 w-16 h-16 border-b-[16px] border-l-[16px] border-white rounded-bl-3xl"></div>
            <!-- Bottom-right corner -->
            <div class="absolute bottom-0 right-0 w-16 h-16 border-b-[16px] border-r-[16px] border-white rounded-br-3xl"></div>

            <div class="flex items-center justify-center h-full">
                <h3 class="text-4xl lg:text-6xl  font-black text-white text-center">Drop files anywhere.</h3>
            </div>
        </div>
    </div>
{/if}
