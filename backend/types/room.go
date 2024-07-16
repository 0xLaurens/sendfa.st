package types

import "github.com/google/uuid"

type RoomOptions func(r *Room)

type Room struct {
	ID    uuid.UUID      `json:"id"`
	Code  string         `json:"code"`
	Users map[*User]bool `json:"users"`
}

func CreateRoom(options ...RoomOptions) *Room {
	room := &Room{
		ID:    uuid.New(),
		Code:  "",
		Users: make(map[*User]bool),
	}

	for _, option := range options {
		option(room)
	}

	return room
}

func (r *Room) AddUser(user *User) {
	r.Users[user] = true
}

func (r *Room) RemoveUser(user *User) {
	delete(r.Users, user)
}

func (r *Room) IsEmpty() bool {
	return len(r.Users) == 0
}

func (r *Room) DisplayNameUnique(displayName string) bool {
	for user := range r.Users {
		if user.DisplayName == displayName {
			return false
		}
	}
	return true
}

func WithRoomCode(code string) RoomOptions {
	return func(r *Room) {
		r.Code = code
	}
}
