import {atom} from "nanostores";
import type {Connection} from "../types/connection.ts";
import {identity, room, sendWebRtcMessage} from "./socket.ts";

const connections = atom(new Map<string, Connection>());

async function _setupDataChannelListeners(connection: Connection) {
    if (!connection.dataChannel) return;
    connection.dataChannel.onopen = () => {
        console.log("Data channel opened");
    }

    connection.dataChannel.onclose = () => {
        console.log("Data channel closed");
    }

    connection.dataChannel.onmessage = (event) => {
        console.log("Data channel message", event.data);
    }
}

async function _setupPeerConnectionListeners(connection: Connection, socket: WebSocket | null) {
    connection.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            const payload = {
                roomId: room.get().id,
                candidate: event.candidate,
                from: identity.get().id,
                to: "target",
            }

            sendWebRtcMessage(socket, "ICE_CANDIDATE", payload);
        }
    }

    connection.peerConnection.oniceconnectionstatechange = (event) => {
        console.log("ICE Connection State Change", connection.peerConnection.iceConnectionState);
    }

    connection.peerConnection.ondatachannel = (event) => {
        connection.dataChannel = event.channel;
        connection.dataChannel.binaryType = "arraybuffer";
        
        _setupDataChannelListeners(connection);
    }

    connection.peerConnection.ontrack = (event) => {
        console.log("Track event", event);
    }
}

export async function createRtcOffer(socket: WebSocket | null, target: string) {
    if (connections.get().has(target)) return;
    let connection: Connection = {
        peerConnection: new RTCPeerConnection({iceServers: [{urls: "stun:stun.l.google.com:19302"}]})
    };
    connections.get().set(target, connection);
    connection.dataChannel = connection.peerConnection.createDataChannel("files");
    connection.dataChannel.binaryType = "arraybuffer";

    await _setupPeerConnectionListeners(connection, socket);
    await _setupDataChannelListeners(connection);


    const offer = await connection.peerConnection.createOffer();
    await connection.peerConnection.setLocalDescription(offer);


    const payload = {
        roomId: room.get().id,
        offer: offer,
        from: identity.get().id,
        to: target,
    }

    sendWebRtcMessage(socket, "OFFER", payload);
}

export async function handleRtcOffer(socket: WebSocket | null, data: any) {
    console.log("Handle offer", data);
    let connection: Connection = {
        peerConnection: new RTCPeerConnection({iceServers: [{urls: "stun:stun.l.google.com:19302"}]})
    };
    connections.get().set(data.payload.from, connection);

    await _setupPeerConnectionListeners(connection, socket);

    await connection.peerConnection.setRemoteDescription(data.payload.offer).catch(console.error);
    const answer = await connection.peerConnection.createAnswer();
    await connection.peerConnection.setLocalDescription(answer);

    const payload = {
        roomId: room.get().id,
        answer: answer,
        from: identity.get().id,
        to: data.from,
    }

    sendWebRtcMessage(socket, "ANSWER", payload);
}

export async function handleRtcAnswer(data: any) {
    const connection = connections.get().get(data.payload.from);
    if (!connection) {
        console.error("Handle Answer", "Connection not found");
        return;
    }

    await connection.peerConnection.setRemoteDescription(data.payload.answer).catch(console.error);
}

export async function handleIceCandidate(data: any) {
    const connection = connections.get().get(data.payload.from);
    console.log("Handle ICE Candidate", data.payload);
    if (!connection) {
        console.error("Handle ICE Candidate", "Connection not found");
        return;
    }

    await connection.peerConnection.addIceCandidate(data.payload.candidate).catch(console.error);
}