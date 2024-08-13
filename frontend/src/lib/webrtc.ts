class WebRTCPeer {
    roomId: string;
    localId: string;
    remoteId: string;
    socket: WebSocket;
    peerConnection: RTCPeerConnection;
    dataChannel?: RTCDataChannel;


    constructor(roomId: string, localId: string, remoteId: string, socket: WebSocket) {
        this.localId = localId;
        this.remoteId = remoteId;
        this.roomId = roomId;
        this.socket = socket;
        this.peerConnection = new RTCPeerConnection({iceServers: [{urls: "stun:stun.l.google.com:19302"}]});

        this.peerConnection.onicecandidate = (event) => {
            console.log("onicecandidate", event.candidate);
            if (event.candidate !== null) {

                const payload = {
                    roomId: this.roomId,
                    candidate: event.candidate,
                    from: this.localId,
                    to: this.remoteId,
                }

                this.sendSignalingMessage("ICE_CANDIDATE", payload);
            }
        }

        this.peerConnection.oniceconnectionstatechange = (event) => {
            console.log("oniceconnectionstatechange", this.peerConnection.iceConnectionState);
        }

        this.peerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
            console.log("Data channel received!");
            this.dataChannel = event.channel;
            this.setupDataChannelListeners();
        }
    }

    setupDataChannelListeners() {
        if (!this.dataChannel) {
            console.log("Data channel not created");
            return;
        }

        this.dataChannel.onopen = () => {
            console.log("Data channel opened");
            this.dataChannel?.send("Hello from the other side");
        }

        this.dataChannel.onmessage = (event) => {
            console.log("Message received", event.data);
        }
    }

    createDataChannel() {
        this.dataChannel = this.peerConnection.createDataChannel("data");
        this.setupDataChannelListeners();
    }

    async handleAnswer(answer: RTCSessionDescriptionInit) {
        await this.peerConnection.setRemoteDescription(answer);
    }

    async createOffer() {
        this.createDataChannel();

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        const payload = {
            roomId: this.roomId,
            offer: offer,
            from: this.localId,
            to: this.remoteId,
        }

        this.sendSignalingMessage("OFFER", payload);
    }

    async handleOffer(offer: RTCSessionDescriptionInit) {
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        const payload = {
            roomId: this.roomId,
            answer: answer,
            from: this.localId,
            to: this.remoteId,
        }

        this.sendSignalingMessage("ANSWER", payload);
    }

    async handleIceCandidate(candidate: RTCIceCandidate) {
        await this.peerConnection.addIceCandidate(candidate);
    }

    close() {
        this.peerConnection.close();
        if (this.dataChannel) {
            this.dataChannel.close();
        }
    }

    private sendSignalingMessage(type: string, payload: any) {
        const message = JSON.stringify({type, payload});
        this.socket.send(message);
    }
}

export default WebRTCPeer;