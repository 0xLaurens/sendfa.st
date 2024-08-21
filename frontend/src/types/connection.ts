export type Connection = {
    peerConnection: RTCPeerConnection;
    dataChannel?: RTCDataChannel;
    target: string;
}