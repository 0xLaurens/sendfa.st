package types

import "github.com/google/uuid"

type Room struct {
	ID    uuid.UUID      `json:"id"`
	Code  string         `json:"code"`
	Users map[*User]bool `json:"users"`
}

func CreateRoom(code string) *Room {
	return &Room{
		ID:    uuid.New(),
		Code:  code,
		Users: make(map[*User]bool),
	}
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
