import StreamSaver from "streamsaver";
import {connections} from "./webrtc.ts";
import {type FileMessage, type FileOffer, FileOfferType} from "../types/file.ts";
import {identity} from "./socket.ts";
import {uuid} from "@supabase/supabase-js/dist/main/lib/helpers";
import {atom, type WritableAtom} from "nanostores";

const incomingFileOffers: WritableAtom<FileOffer[]> = atom([])
export const currentFileOffer: WritableAtom<FileOffer | null> = atom(null)
const outgoingFileOffers = atom(Map<string, FileOffer>)
const offeredFiles = atom(new Map<string, File>)

export function addIncomingFileOffer(offer: FileOffer) {
    console.log("Adding incoming file offer", offer);
    incomingFileOffers.get().push(offer)
    if (currentFileOffer.get() === null) {
        currentFileOffer.set(offer)
    }
}

export function acceptIncomingFileOffer() {
    const offer = currentFileOffer.get()
    if (offer) {
        const connection = connections.get().get(offer.from)
        if (connection && connection.dataChannel) {
            offer.type = FileOfferType.AcceptOffer
            connection.dataChannel.send(JSON.stringify(offer))
        }
    }
    currentFileOffer.set(null)
}

export function denyIncomingFileOffer() {
    const offer = currentFileOffer.get()
    if (offer) {
        const connection = connections.get().get(offer.from)
        if (connection && connection.dataChannel) {
            offer.type = FileOfferType.DenyOffer
            connection.dataChannel.send(JSON.stringify(offer))
        }
    }
    currentFileOffer.set(null)
}

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
            while (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
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

function filesToMessage(files: FileList): FileMessage[] {
    let messages: FileMessage[] = []
    for (let i = 0; i < files.length; i++) {
        messages.push({
            name: files[i].name,
            size: files[i].size,
            mime: files[i].type,
            progress: 0
        })
    }
    return messages
}

export function createFilesOffers(files: FileList) {
    for (const [target, connection] of connections.get()) {
        if (connection.peerConnection.connectionState === "connected" && connection.dataChannel) {
            createFilesOffer(files, target)
        }
    }
}

function createFilesOffer(files: FileList, target: string) {
    const messages = filesToMessage(files)
    const offer: FileOffer = {
        id: uuid(),
        type: FileOfferType.Offer,
        files: messages,
        from: identity.get().id,
        to: target,
    }

    const connection = connections.get().get(target)
    if (connection && connection.dataChannel) {
        connection.dataChannel.send(JSON.stringify(offer))
    }
}