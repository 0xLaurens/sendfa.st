export type FileOffer = {
    id: string
    type: FileOfferType
    from: string
    to: string
    files: FileMessage[]
}

export enum FileOfferType {
    Offer = "OFFER", // Offer to send files
    AcceptOffer = "ACCEPT_OFFER", // Accept offer to receive files
    DenyOffer = "DENY_OFFER", // Reject offer to receive files
}

export type FileMessage = {
    name: string
    size: number
    mime: string
    progress: number
}