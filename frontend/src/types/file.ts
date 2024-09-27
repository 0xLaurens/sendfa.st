export type FileOffer = {
    id: string
    type: FileOfferType
    from: string
    to: string
    currentFile: number
    files: FileMessage[]
}

export enum FileOfferType {
    Offer = "OFFER", // Offer to send files
    AcceptOffer = "ACCEPT_OFFER", // Accept offer to receive files
    DenyOffer = "DENY_OFFER", // Reject offer to receive files
    RequestNextFile = "REQUEST_NEXT_FILE", // Request the next file
    ReadyForOffer = "READY_FOR_OFFER", // Ready to receive files
}

export type FileMessage = {
    name: string
    size: number
    mime: string
}

export type FileProgress = {
    id: string
    currentFile: number
    progress: number
}