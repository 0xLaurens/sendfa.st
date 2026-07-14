export type Connection = {
    peerConnection: RTCPeerConnection;
    dataChannel?: RTCDataChannel;
    pendingIceCandidates: RTCIceCandidateInit[];
    target: string;
}
