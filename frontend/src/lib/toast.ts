import {atom, type WritableAtom} from "nanostores";
import {persistentAtom} from "@nanostores/persistent";
import type {ToastData} from "../types/toast";

// const toasts = atom<ToastData[]>([]);
const toasts: WritableAtom<ToastData[]> = persistentAtom("toats", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

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