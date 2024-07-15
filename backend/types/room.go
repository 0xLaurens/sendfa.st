package types

import "github.com/google/uuid"

type Room struct {
	ID   uuid.UUID `json:"id"`
	Code string    `json:"code"`
}

func CreateRoom(code string) *Room {
	return &Room{
		ID:   uuid.New(),
		Code: code,
	}
}
