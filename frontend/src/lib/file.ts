import StreamSaver from "streamsaver";
import {connections} from "./webrtc.ts";

StreamSaver.mitm = `https://jimmywarting.github.io/StreamSaver.js/mitm.html?version=2.0.0`;
let stream: WritableStream<Uint8Array> | null
let writer: WritableStreamDefaultWriter<Uint8Array> | null
let accSize = 0

export async function sendFileToAll(file: File) {
    console.log("Sending file to all", file);
    for (const [target, connection] of connections.get()) {
        if (connection.peerConnection.connectionState === "connected" && connection.dataChannel) {
            await sendFile(file, connection.dataChannel)
        }
    }
}

async function sendFile(file: File, dc: RTCDataChannel) {
    const stream = file.stream()
    const reader = stream.getReader()

    const CHUNK_SIZE = 16384 // 16KiB chrome being chrome
    dc.bufferedAmountLowThreshold = 1048576 // 1mb

    const readChunk = async () => {
        const {value} = await reader.read()
        if (!value) return
        let buf = value
        while (buf.byteLength) {
            while(dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
                await new Promise(resolve => dc.onbufferedamountlow = resolve)
            }
            const chunk = buf.slice(0, CHUNK_SIZE)
            buf = buf.slice(CHUNK_SIZE)
            dc.send(chunk)
        }
        await readChunk()
    }

    await readChunk()
}

export async function buildFile(chunk: ArrayBuffer) {
    console.log("Building file", chunk.byteLength);
    if (!stream) {
        stream = StreamSaver.createWriteStream("demo.mp4", {size: 296136554})
        writer = stream.getWriter()
    }

    const buffer = new Uint8Array(chunk)
    await writer?.write(buffer).catch(console.error)

    accSize += buffer.byteLength
    if (accSize === 296136554) {
        await writer?.close().catch(console.error)
        stream = null
        writer = null
        accSize = 0
    }
}