package types

var (
	Offer       = "OFFER"
	Answer      = "ANSWER"
	Candidate   = "CANDIDATE"
	JoinRoom    = "JOIN_ROOM"
	LeaveRoom   = "LEAVE_ROOM"
	RequestRoom = "REQUEST_ROOM"
	RoomExists  = "ROOM_EXISTS"
)

type Message struct {
	Type string `json:"type"`
}

type JoinRoomMessage struct {
	Type string `json:"type"`
	Code string `json:"code"`
	User User   `json:"user"`
}
