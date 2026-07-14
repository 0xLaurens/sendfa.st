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
export const downloadCancelled: WritableAtom<boolean> = atom(false);
export const checkedRoomCode: WritableAtom<boolean> = atom(false);

class WebsocketManager {
    private socket: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly url: string;

    constructor(url: string) {
        this.url = url;
    }

    connect() {
        if (this.socket?.readyState === WebSocket.CONNECTING || this.socket?.readyState === WebSocket.OPEN) return;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        const socket = new WebSocket(this.url);
        this.socket = socket;
        socket.onopen = () => {
            if (this.socket !== socket) return;
            console.log("Connected to websocket server");
            isConnected.set(true);
        }

        socket.onclose = () => {
            if (this.socket !== socket) return;
            console.log("Disconnected from websocket server");
            isConnected.set(false);
            closeAllWebRtcConnections()
            if (roomId.get() !== undefined) {
                this.reconnectTimer = setTimeout(() => {
                    this.reconnectTimer = null;
                    this.connect();
                }, 1000);
            }
        }

        socket.onerror = (error) => {
            console.error("Websocket error", error);
        }

        socket.onmessage = async (event) => {
            if (this.socket !== socket) return;
            try {
                await this.handleMessages(JSON.parse(event.data));
            } catch (error) {
                console.error("Invalid websocket message", error);
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
        isConnected.set(false);
        users.set([]);
        this.socket = null;
    }

    async handleMessages(data: any) {
        console.log("message type:", data.type, "data:", data);
        switch (data.type) {
            case "IDENTITY": {
                identity.set(data.user);
                // is there an existing room code in localstorage?
                // let code = roomCode.get();
                let id = roomId.get();
                if (id !== undefined) {
                    // verify if the room still exists
                    sendRoomExists(this.socket, id);
                    break;
                }

                // request a new room
                sendRequestRoom(this.socket);
                break;
            }
            case "ROOM_CREATED": {
                room.set(data.room);
                roomId.set(data.room.id);
                isConnected.set(true);
                users.set([])
                break;
            }
            case "ROOM_EXISTS": {
                let exists = data.exists;
                roomExists.set(exists);
                if (!exists) {
                    checkedRoomCode.set(true);
                    break;
                }
                roomId.set(data.roomId);
                sendJoinRoom(this.socket, data.roomId);
                break;
            }
            case "ROOM_JOINED": {
                downloadCancelled.set(false);
                checkedRoomCode.set(true);
                room.set(data.room);
                for (let user of data.users) {
                    if (user.id === identity.get().id) {
                        continue;
                    }

                    users.set([...users.get(), user]);
                }
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
                console.log("Download cancelled");
                downloadCancelled.set(true);
                break;
            }
        }
    }
}

function sendRequestRoom(socket: WebSocket | null) {
    send(socket, {
        type: "REQUEST_ROOM"
    });
}

function sendRoomExists(socket: WebSocket | null, roomId: string) {
    send(socket, {
        type: "ROOM_EXISTS",
        payload: {
            roomId: roomId
        }
    });
}

function sendJoinRoom(socket: WebSocket | null, roomId: string) {
    send(socket, {
        type: "JOIN_ROOM",
        payload: {
            roomId: roomId
        }
    });
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
