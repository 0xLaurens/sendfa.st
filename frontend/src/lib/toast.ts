import {atom} from "nanostores";
import type {ToastData} from "../types/toast";

const toasts = atom<ToastData[]>([]);

export function addToast(toast: ToastData, duration = 3000) {
    toast.id = Date.now();
    toasts.set([...toasts.get(), toast]);

    setTimeout(() => {
        closeToast(toast.id);
    }, duration)
}

export function closeToast(id: number) {
    toasts.set(toasts.get().filter((toast) => toast.id !== id));
}

export default toasts;