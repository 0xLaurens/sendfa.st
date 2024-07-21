package types

import "encoding/json"

var (
	Offer       = "OFFER"
	Answer      = "ANSWER"
	Candidate   = "CANDIDATE"
	JoinRoom    = "JOIN_ROOM"
	LeaveRoom   = "LEAVE_ROOM"
	RequestRoom = "REQUEST_ROOM"
	RoomExists  = "ROOM_EXISTS"
)

// Message
// A struct for containing messages sent by the user
type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type JoinPayload struct {
	Code string `json:"code"`
	User User   `json:"user"`
}
