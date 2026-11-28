import {atom, computed, type WritableAtom} from "nanostores";
import type {User} from "../types/user.ts";
import type {Room} from "../types/room.ts";
import {interruptTransfers} from "./file.ts";
import {
    closeAllWebRtcConnections,
    closeWebRtcConnection,
    createRtcOffer,
    handleIceCandidate,
    handleRtcAnswer,
    handleRtcOffer
} from "./webrtc.ts";

export const isConnected = atom(false);
export const users: WritableAtom<User[]> = atom([]);
export const identity: WritableAtom<User> = atom({});
export const room: WritableAtom<Room> = atom({});
export const roomId: WritableAtom<string | undefined> = atom(undefined);
export const roomExists: WritableAtom<boolean> = atom(false);
export const roomAdmitted = atom(false);
export const connectionError = atom<string | undefined>(undefined);
export const connectionNotice = atom<string | undefined>(undefined);
export const downloadCancelled: WritableAtom<boolean> = atom(false);
export const checkedRoomCode: WritableAtom<boolean> = atom(false);

export const admittedRoomPath = computed([roomAdmitted, roomId], (admitted, id) =>
    admitted && id ? `/r/${id}` : undefined);

class WebsocketManager {
    private socket: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private readonly url: string;
    private readonly createRoom: boolean;
    private admissionFailed = false;
    private lifecycle = 0;
    private connecting = false;

    constructor(url: string, createRoom = false) {
        this.url = url;
        this.createRoom = createRoom;
    }

    async connect() {
        if (this.admissionFailed) return;
        if (this.socket?.readyState === WebSocket.CONNECTING || this.socket?.readyState === WebSocket.OPEN) return;
        if (this.connecting) return;
        this.connecting = true;
        connectionError.set(undefined);
        const lifecycle = this.lifecycle;

        try {
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            if (this.createRoom && roomId.get() === undefined) {
                try {
                    const response = await fetch(this.url.replace(/^ws/, "http").replace(/\/api\/websocket.*$/, "/api/rooms"), {method: "POST"});
                    if (lifecycle !== this.lifecycle) return;
                    if (!response.ok) throw new Error("Unable to create a room");
                    const created = await response.json();
                    if (lifecycle !== this.lifecycle) return;
                    if (!created.id) throw new Error("Invalid room response");
                    roomId.set(created.id);
                } catch {
                    if (lifecycle !== this.lifecycle) return;
                    isConnected.set(false);
                    connectionError.set("Unable to create a sharing room. Please try again.");
                    return;
                }
            } else if (roomId.get()) {
                const apiBase = this.url.replace(/^ws/, "http").replace(/\/api\/websocket.*$/, "/api/rooms/");
                try {
                    const status = await fetch(`${apiBase}${roomId.get()}`, {cache: "no-store"});
                    if (lifecycle !== this.lifecycle) return;
                    const failure = status.status === 404 || status.status === 400 ? await status.json() : null;
                    if (lifecycle !== this.lifecycle) return;
                    if ((status.status === 404 && failure?.exists === false) ||
                        (status.status === 400 && failure?.error === "invalid_room_id")) {
                        this.admissionFailed = true;
                        roomExists.set(false);
                        checkedRoomCode.set(true);
                        connectionError.set("This room link is invalid or has expired.");
                        return;
                    }
                } catch {
                    if (lifecycle !== this.lifecycle) return;
                    // Preserve retry behavior for temporary network failures.
                }
            }
            if (lifecycle !== this.lifecycle) return;
            const target = new URL(this.url);
            const id = roomId.get();
            if (id) target.searchParams.set("roomId", id);
            const socket = new WebSocket(target.toString());
            this.socket = socket;
            socket.onopen = () => {
                if (this.socket !== socket) return;
                isConnected.set(true);
            }

            socket.onclose = () => {
                if (this.socket !== socket) return;
                this.socket = null;
                if (roomAdmitted.get()) {
                    interruptTransfers();
                    connectionNotice.set("Connection lost. Interrupted transfers must be restarted after reconnecting.");
                }
                isConnected.set(false);
                roomAdmitted.set(false);
                users.set([]);
                closeAllWebRtcConnections()
                if (!this.admissionFailed && roomId.get() !== undefined) {
                    const ceiling = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempts++);
                    const delay = Math.floor(ceiling * (0.5 + Math.random() * 0.5));
                    this.reconnectTimer = setTimeout(() => {
                        this.reconnectTimer = null;
                        this.connect();
                    }, delay);
                }
            }

            socket.onerror = () => {};

            socket.onmessage = async (event) => {
                if (this.socket !== socket) return;
                try {
                    await this.handleMessages(JSON.parse(event.data));
                } catch (error) {
                    // Ignore malformed server frames without logging signaling data.
                }
            }
        } finally {
            if (lifecycle === this.lifecycle) this.connecting = false;
        }
    }

    getWebSocket(): WebSocket | null {
        return this.socket;
    }

    close() {
        this.lifecycle++;
        this.connecting = false;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        const socket = this.socket;
        this.socket = null;
        socket?.close();
        closeAllWebRtcConnections();
        interruptTransfers();
        roomId.set(undefined);
        roomAdmitted.set(false);
        isConnected.set(false);
        users.set([]);
        connectionError.set(undefined);
        connectionNotice.set(undefined);
        this.admissionFailed = false;
        this.reconnectAttempts = 0;
    }

    async handleMessages(data: any) {
        switch (data.type) {
            case "IDENTITY": {
                identity.set(data.user);
                break;
            }
            case "ROOM_JOINED": {
                downloadCancelled.set(false);
                checkedRoomCode.set(true);
                room.set(data.room);
                roomExists.set(true);
                roomAdmitted.set(true);
                this.reconnectAttempts = 0;
                users.set((data.users || []).filter((user: User) => user.id !== identity.get().id));
                break;
            }
            case "USER_JOINED": {
                // use a set to make sure we don't have duplicates
                if (!users.get().find(user => user.id === data.user.id)) {
                    users.set([...users.get(), data.user]);
                    await createRtcOffer(this.socket, data.user.id);
                }

                break;
            }
            case "USER_LEFT": {
                users.set(users.get().filter(user => user.id !== data.user.id));
                await closeWebRtcConnection(data.user.id);
                break;
            }
            case "OFFER": {
                await handleRtcOffer(this.socket, data);
                break;
            }
            case "ANSWER": {
                await handleRtcAnswer(data);
                break;
            }
            case "ICE_CANDIDATE": {
                await handleIceCandidate(data);
                break;
            }
            case "CANCEL_DOWNLOAD": {
                downloadCancelled.set(true);
                break;
            }
            case "ROOM_REJECTED": {
                this.admissionFailed = true;
                roomExists.set(false);
                checkedRoomCode.set(true);
                connectionError.set("The room rejected this connection. Please request a new link.");
                this.socket?.close();
                break;
            }
        }
    }
}

export function sendCancelDownload(socket: WebSocket | null) {
    send(socket, {
        type: "CANCEL_DOWNLOAD",
        payload: {
            roomId: roomId.get()
        }
    });
}

export function sendWebRtcMessage(socket: WebSocket | null, type: string, payload: any) {
    send(socket, {type, payload});
}

function send(socket: WebSocket | null, message: unknown) {
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
}

export default WebsocketManager;
