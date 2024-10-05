package types

import (
	"encoding/json"
	"github.com/google/uuid"
)

var (
	Offer          = "OFFER"
	Answer         = "ANSWER"
	IceCandidate   = "ICE_CANDIDATE"
	JoinRoom       = "JOIN_ROOM"
	LeaveRoom      = "LEAVE_ROOM"
	RequestRoom    = "REQUEST_ROOM"
	RoomExists     = "ROOM_EXISTS"
	CancelDownload = "CANCEL_DOWNLOAD"
)

// Message
// A struct for containing messages sent by the user
type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type RoomIdPayload struct {
	RoomID uuid.UUID `json:"roomId"`
}
