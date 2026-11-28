import StreamSaver from "streamsaver";
import {connections} from "./webrtc.ts";
import {type FileOffer, FileOfferType} from "../types/file.ts";
import {identity} from "./socket.ts";
import {atom, type WritableAtom} from "nanostores";
import {v4 as uuidv4} from "uuid";

export const filesUploaded: WritableAtom<File[] | null> = atom(null)
const incomingFileOffers: WritableAtom<FileOffer[]> = atom([])
export const currentFileOffer: WritableAtom<FileOffer | null> = atom(null)
const offeredFiles = atom(new Map<string, File[]>)
export const downloadFinished: WritableAtom<boolean> = atom(false)

export function addIncomingFileOffer(offer: FileOffer) {
    incomingFileOffers.set([...incomingFileOffers.get(), offer])
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
        downloadFinished.set(true)
        currentFileOffer.set(null)
    }
}

StreamSaver.mitm = `/StreamSaver/mitm.html?version=2.0.6`;
let stream: WritableStream<Uint8Array> | null
let writer: WritableStreamDefaultWriter<Uint8Array> | null
let accSize = 0
let transferGeneration = 0

export function interruptTransfers() {
    transferGeneration++;
    incomingFileOffers.set([]);
    currentFileOffer.set(null);
    offeredFiles.set(new Map());
    downloadFinished.set(false);
    const interruptedWriter = writer;
    writer = null;
    stream = null;
    accSize = 0;
    if (interruptedWriter) void interruptedWriter.abort().catch(() => {});
}

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
    const generation = transferGeneration;
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
    if (generation !== transferGeneration) return;
    console.log("accSize", accSize, "Filesize", file.size)
    accSize += buffer.byteLength

    if (accSize === file.size) {
        await writer?.close().catch(console.error)
        if (generation !== transferGeneration) return;
        stream = null
        writer = null
        accSize = 0
        if (offer.currentFile === offer.files.length - 1) {
            downloadFinished.set(true)
            currentFileOffer.set(null)
            nextFileOffer()
        }
        if (offer.currentFile < offer.files.length - 1) {
            offer.currentFile++
            requestNextFile(offer)
        }
    }
}

export function createFilesOffer(files: File[], target: string) {
    const offer: FileOffer = {
        id: uuidv4(),
        type: FileOfferType.Offer,
        files: files.map(({name, size, type}) => ({name, size, mime: type})),
        from: identity.get().id,
        currentFile: 0,
        to: target,
    }
    offeredFiles.set(new Map(offeredFiles.get()).set(offer.id, files))

    const connection = connections.get().get(target)
    if (connection && connection.dataChannel) {
        connection.dataChannel.send(JSON.stringify(offer))
    }
}
