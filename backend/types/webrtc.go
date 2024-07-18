package types

import "github.com/google/uuid"

// ================================
// File: backend/types/webrtc.go
// ================================
// This file contains the types for the WebRTC protocol.

//#region WebRTC Candidates

type CandidateMessage struct {
	Type      string          `json:"type"`
	Candidate RTCIceCandidate `json:"candidate"`
	From      uuid.UUID       `json:"from"`
	To        uuid.UUID       `json:"to"`
	RoomID    uuid.UUID       `json:"roomID"`
}

type RTCIceCandidate struct {
	Candidate        string `json:"candidate"`
	SdpMid           string `json:"sdpMid"`
	SdpMLineIndex    int    `json:"sdpMLineIndex"`
	UsernameFragment string `json:"usernameFragment"`
}

//#endregion

//#region WebRTC Offers and Answers

type OfferAnswerMessage struct {
	Type   string    `json:"type"`
	SDP    string    `json:"SDP"`
	From   uuid.UUID `json:"from"`
	To     uuid.UUID `json:"to"`
	RoomID uuid.UUID `json:"roomID"`
}

//#endregion
