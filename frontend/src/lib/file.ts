import StreamSaver from "streamsaver";
import {connections} from "./webrtc.ts";
import {type FileMessage, type FileOffer, FileOfferType} from "../types/file.ts";
import {identity} from "./socket.ts";
import {uuid} from "@supabase/supabase-js/dist/main/lib/helpers";
import {atom, type WritableAtom} from "nanostores";

export const filesUploaded: WritableAtom<FileList | null> = atom(null)
const incomingFileOffers: WritableAtom<FileOffer[]> = atom([])
export const currentFileOffer: WritableAtom<FileOffer | null> = atom(null)
const offeredFiles = atom(new Map<string, FileList>)

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
}

function nextFileOffer() {
    incomingFileOffers.set(incomingFileOffers.get().slice(1))
    if (incomingFileOffers.get().length > 0) {
        currentFileOffer.set(incomingFileOffers.get()[0])
    } else {
        currentFileOffer.set(null)
    }
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

export function requestNextFile(offer: FileOffer) {
    offer.type = FileOfferType.RequestNextFile
    const connection = connections.get().get(offer.from)
    if (connection && connection.dataChannel) {
        connection.dataChannel.send(JSON.stringify(offer))
    }
}

export async function sendFile(fileOffer: FileOffer) {
    const connection = connections.get().get(fileOffer.to)
    if (!connection || !connection.dataChannel) return

    const file = offeredFiles.get().get(fileOffer.id)?.[fileOffer.currentFile]
    if (!file) return;

    const stream = file.stream()
    const reader = stream.getReader()

    const CHUNK_SIZE = 16384 // 16KiB chrome being chrome
    connection.dataChannel.bufferedAmountLowThreshold = 1048576 // 1mb

    const readChunk = async () => {
        const {value} = await reader.read()
        if (!value) return
        let buf = value
        while (buf.byteLength) {
            while (connection.dataChannel!.bufferedAmount > connection.dataChannel!.bufferedAmountLowThreshold) {
                await new Promise(resolve => connection.dataChannel!.onbufferedamountlow = resolve)
            }
            const chunk = buf.slice(0, CHUNK_SIZE)
            buf = buf.slice(CHUNK_SIZE)
            connection.dataChannel!.send(chunk)
        }
        await readChunk()
    }

    await readChunk()
}

export async function buildFile(chunk: ArrayBuffer) {
    console.log("Building file", chunk.byteLength);
    const offer = currentFileOffer.get()
    if (!offer) {
        console.error("No current file offer")
        return
    }

    const file = offer.files[offer.currentFile]

    if (!stream) {
        stream = StreamSaver.createWriteStream(file.name, {size: file.size})
        writer = stream.getWriter()
    }

    const buffer = new Uint8Array(chunk)
    await writer?.write(buffer).catch(console.error)
    console.log("accSize", accSize, "Filesize", file.size)
    accSize += buffer.byteLength
    if (accSize === file.size) {
        await writer?.close().catch(console.error)
        stream = null
        writer = null
        accSize = 0
        if (offer.currentFile === offer.files.length - 1) {
            currentFileOffer.set(null)
            nextFileOffer()
        }
        if (offer.currentFile < offer.files.length - 1) {
            offer.currentFile++
            requestNextFile(offer)
        }
    }
}

function filesToMessage(files: FileList): FileMessage[] {
    let messages: FileMessage[] = []
    for (let i = 0; i < files.length; i++) {
        messages.push({
            name: files[i].name,
            size: files[i].size,
            mime: files[i].type,
        })
    }
    return messages
}

export function createFilesOffers(files: FileList) {
    if (files.length === 0) return;

    for (const [target, connection] of connections.get()) {
        if (connection.peerConnection.connectionState === "connected" && connection.dataChannel) {
            createFilesOffer(files, target)
        }
    }
}

export function createFilesOffer(files: FileList, target: string) {
    const messages = filesToMessage(files)
    const offer: FileOffer = {
        id: uuid(),
        type: FileOfferType.Offer,
        files: messages,
        from: identity.get().id,
        currentFile: 0,
        to: target,
    }
    offeredFiles.get().set(offer.id, files)

    const connection = connections.get().get(target)
    if (connection && connection.dataChannel) {
        connection.dataChannel.send(JSON.stringify(offer))
    }
}