import {atom, type WritableAtom} from "nanostores";
import {persistentAtom} from "@nanostores/persistent";
import type {ToastData} from "../types/toast";

// const toasts = atom<ToastData[]>([]);
const toasts: WritableAtom<ToastData[]> = persistentAtom("toats", [], {
    encode: JSON.stringify,
    decode: JSON.parse,
});

const timers = atom(new Map<number, NodeJS.Timeout>());

export function addToast(toast: ToastData, duration = 3000) {
    toast.id = Date.now();
    toast.duration = duration;
    toasts.set([...toasts.get(), toast]);

    timers.get().set(toast.id, setTimeout(() => {
        closeToast(toast.id);
    }, toast.duration));
}

export function closeToast(id: number) {
    toasts.set(toasts.get().filter((toast) => toast.id !== id));
}

export function triggerTimeouts() {
    toasts.get().forEach((toast) => {
        if (!timers.get().has(toast.id)) {
            timers.get().set(toast.id, setTimeout(() => {
                closeToast(toast.id);
            }, toast.duration || 3000));
        }
    });
}


export default toasts;