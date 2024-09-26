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

export const roomCode: WritableAtom<string | undefined> = atom(undefined);
export const isConnected = atom(false);
export const users: WritableAtom<User[]> = atom([]);
export const identity: WritableAtom<User> = atom({});
export const room: WritableAtom<Room> = atom({});
export const roomId: WritableAtom<string | undefined> = atom(undefined);

class WebsocketManager {
    private socket: WebSocket | null = null;
    private readonly url: string;

    constructor(url: string) {
        this.url = url;
    }

    connect() {
        this.socket = new WebSocket(this.url);
        this.socket.onopen = () => {
            console.log("Connected to websocket server");
        }

        this.socket.onclose = () => {
            console.log("Disconnected from websocket server");
            isConnected.set(false);
            closeAllWebRtcConnections()
            setTimeout(() => {
                this.connect();
            }, 1000);
        }

        this.socket.onerror = (error) => {
            console.error("Websocket error", error);
        }

        this.socket.onmessage = async (event) => {
            let data = JSON.parse(event.data);
            await this.handleMessages(data);
        }
    }

    close() {
        if (this.socket) {
            this.socket.close();
        }
        this.socket = null;
    }

    async handleMessages(data: any) {
        console.log("message type:", data.type, "data:", data);
        switch (data.type) {
            case "IDENTITY": {
                identity.set(data.user);
                // is there an existing room code in localstorage?
                // let code = roomCode.get();
                let id= roomId.get();
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
                if (!exists) {
                    sendRequestRoom(this.socket);
                    break;
                }
                roomId.set(data.id);
                sendJoinRoom(this.socket, data.id);
                break;
            }
            case "ROOM_JOINED": {
                isConnected.set(true);
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
        }
    }
}

export function findUserById(id: string) {
    return users.get().find(user => user.id === id);
}

function sendRequestRoom(socket: WebSocket | null) {
    if (!socket) return;
    socket.send(JSON.stringify({
        type: "REQUEST_ROOM"
    }))
}

function sendRoomExists(socket: WebSocket | null, roomId: string) {
    if (!socket) return;
    socket.send(JSON.stringify({
        type: "ROOM_EXISTS",
        payload: {
            roomId: roomId
        }
    }))
}

function sendJoinRoom(socket: WebSocket | null, roomId: string) {
    if (!socket) return;
    socket.send(JSON.stringify({
        type: "JOIN_ROOM",
        payload: {
            roomId: roomId
        }
    }))
}

export function sendWebRtcMessage(socket: WebSocket | null, type: string, payload: any) {
    if (!socket) return;
    const message = JSON.stringify({type, payload});
    socket.send(message);
}

export default WebsocketManager;