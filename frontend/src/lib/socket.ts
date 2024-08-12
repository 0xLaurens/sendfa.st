import {atom} from "nanostores";

export const roomCode = atom<string | null>(null);

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
                if (roomCode.get() === null) {
                    this.socket.send(JSON.stringify({
                        type: "REQUEST_ROOM",
                    }));
                }
                break;
            }
            case "ROOM_CREATED": {
                console.log("Room created", data.room);
                let room = data.room;
                roomCode.set(room.code);
                break;
            }
        }
    }
}


export default WebsocketManager;