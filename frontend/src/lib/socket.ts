import {atom} from "nanostores";
import {persistentAtom} from "@nanostores/persistent";

export const roomCode = persistentAtom("roomCode", undefined);

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
            this.socket = null;
        }

        this.socket.onerror = (error) => {
            console.error("Websocket error", error);
        }

        this.socket.onmessage = (event) => {
            let data = JSON.parse(event.data);
            this.handleMessages(data);
        }
    }

    handleMessages(data: any) {
        console.log("message type:", data.type);
        switch (data.type) {
            case "IDENTITY": {
                console.log("Identity", data.user);
                if (!this.socket) break;
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
                let room = data.room;
                roomCode.set(room.code);
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
                // TODO: join the room

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

export default WebsocketManager;