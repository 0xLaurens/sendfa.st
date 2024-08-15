import {atom, map, type MapStore, type WritableAtom} from "nanostores";
import {persistentAtom} from "@nanostores/persistent";
import type {User} from "../types/user.ts";
import WebRTCPeer from "./webrtc.ts";
import type {Room} from "../types/room.ts";

export const roomCode: WritableAtom<string | undefined> = persistentAtom("roomCode", undefined);
export const isConnected = atom(false);
export const users: WritableAtom<User[]> = atom([]);
export const identity: WritableAtom<User> = atom({});
export const peers: MapStore<Record<string, WebRTCPeer>> = map<Record<string, WebRTCPeer>>({});
export const room: WritableAtom<Room> = atom({});

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
            setTimeout(() => {
                this.connect();
            }, 1000);
        }

        this.socket.onerror = (error) => {
            console.error("Websocket error", error);
        }

        this.socket.onmessage = (event) => {
            let data = JSON.parse(event.data);
            this.handleMessages(data);
        }
    }

    close() {
        if (this.socket) {
            this.socket.close();
        }
        this.socket = null;
    }

    async handleMessages(data: any) {
        console.log("message type:", data.type);
        switch (data.type) {
            case "IDENTITY": {
                console.log("Identity", data.user);
                identity.set(data.user);
                // is there an existing room code in localstorage?
                let code = roomCode.get();
                if (code !== undefined) {
                    // verify if the room still exists
                    sendRoomExists(this.socket, code);
                    break;
                }

                // request a new room
                sendRequestRoom(this.socket);
                break;
            }
            case "ROOM_CREATED": {
                console.log("Room created", data.room);
                room.set(data.room);
                roomCode.set(data.room.code);
                isConnected.set(true);
                break;
            }
            case "ROOM_EXISTS": {
                console.log("Room exists", data.exists);
                let exists = data.exists;
                if (!exists) {
                    sendRequestRoom(this.socket);
                    break;
                }
                roomCode.set(data.code);
                sendJoinRoom(this.socket, data.code);
                break;
            }
            case "ROOM_JOINED": {
                console.log("Room joined", data);
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
                console.log("User joined", data);
                // use a set to make sure we don't have duplicates
                if (!users.get().find(user => user.id === data.user.id)) {
                    users.set([...users.get(), data.user]);
                    if (peers.get()[data.user.id] == null) {
                        let peer = new WebRTCPeer(room.get().id, identity.get().id, data.user.id, this.socket!);
                        await peer.createOffer();
                        peers.setKey(data.user.id, peer);
                    }
                }

                break;
            }
            case "USER_LEFT": {
                console.log("User left", data);
                users.set(users.get().filter(user => user.id !== data.user.id));
                let peer = peers.get()[data.user.id];
                if (peer) {
                    peer.close();
                }
                break;
            }
            case "OFFER": {
                console.log("Offer", data);
                let peer = new WebRTCPeer(room.get().id, data.from, data.to, this.socket!);
                await peer.handleOffer(data.payload.offer);
                peers.setKey(data.from, peer);
                break;
            }
            case "ANSWER": {
                console.log("Answer", data);
                let peer = peers.get()[data.from];
                if (peer) {
                    await peer.handleAnswer(data.payload.answer);
                }
            }
            case "ICE_CANDIDATE": {
                console.log("ICE candidate", data);
                let peer = peers.get()[data.from];
                if (peer) {
                    await peer.handleIceCandidate(data.payload.candidate);
                }
                break;
            }
        }
    }
}

function sendRequestRoom(socket: WebSocket | null) {
    if (!socket) return;
    socket.send(JSON.stringify({
        type: "REQUEST_ROOM"
    }))
}

function sendRoomExists(socket: WebSocket | null, code: string) {
    if (!socket) return;
    socket.send(JSON.stringify({
        type: "ROOM_EXISTS",
        payload: {
            code: code
        }
    }))
}

function sendJoinRoom(socket: WebSocket | null, code: string) {
    if (!socket) return;
    socket.send(JSON.stringify({
        type: "JOIN_ROOM",
        payload: {
            code: code
        }
    }))
}

export default WebsocketManager;