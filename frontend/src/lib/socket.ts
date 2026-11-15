import {atom, type WritableAtom} from "nanostores";
import type {User} from "../types/user.ts";
import type {Room} from "../types/room.ts";
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
export const downloadCancelled: WritableAtom<boolean> = atom(false);
export const checkedRoomCode: WritableAtom<boolean> = atom(false);

class WebsocketManager {
    private socket: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private readonly url: string;
    private readonly createRoom: boolean;
    private admissionFailed = false;

    constructor(url: string, createRoom = false) {
        this.url = url;
        this.createRoom = createRoom;
    }

    async connect() {
        if (this.socket?.readyState === WebSocket.CONNECTING || this.socket?.readyState === WebSocket.OPEN) return;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.createRoom && roomId.get() === undefined) {
            try {
                const response = await fetch(this.url.replace(/^ws/, "http").replace(/\/api\/websocket.*$/, "/api/rooms"), {method: "POST"});
                if (!response.ok) throw new Error("Unable to create a room");
                const created = await response.json();
                if (!created.id) throw new Error("Invalid room response");
                roomId.set(created.id);
            } catch {
                isConnected.set(false);
                connectionError.set("Unable to create a sharing room. Please try again.");
                return;
            }
        }
        const target = new URL(this.url);
        if (roomId.get()) {
            const apiBase = this.url.replace(/^ws/, "http").replace(/\/api\/websocket.*$/, "/api/rooms/");
            try {
                const status = await fetch(`${apiBase}${roomId.get()}`);
                if (!status.ok) {
                    this.admissionFailed = true;
                    roomExists.set(false);
                    checkedRoomCode.set(true);
                    connectionError.set("This room link is invalid or has expired.");
                    return;
                }
            } catch {
                // Preserve retry behavior for temporary network failures.
            }
            target.searchParams.set("roomId", roomId.get()!);
        }
        const socket = new WebSocket(target.toString());
        this.socket = socket;
        socket.onopen = () => {
            if (this.socket !== socket) return;
            isConnected.set(true);
        }

        socket.onclose = () => {
            if (this.socket !== socket) return;
            isConnected.set(false);
            roomAdmitted.set(false);
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
    }

    getWebSocket(): WebSocket | null {
        return this.socket;
    }

    close() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.socket?.close();
        closeAllWebRtcConnections();
        roomId.set(undefined);
        roomAdmitted.set(false);
        isConnected.set(false);
        users.set([]);
        this.socket = null;
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
