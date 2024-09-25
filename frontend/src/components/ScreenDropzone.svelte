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
        addToast(toast);
        filesUploaded.set(files);
    }

    onMount(() => {
        return () => {
            clearTimeout(debounceTimer);
        };
    });
</script>


