package types

import (
	"github.com/google/uuid"
	"sync"
)

type RoomOptions func(r *Room)

type Room struct {
	ID        uuid.UUID           `json:"id"`
	Code      string              `json:"code"`
	Users     map[*User]bool      `json:"users"`
	UsersById map[uuid.UUID]*User `json:"-"`
	mu        sync.RWMutex
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
	r.mu.Lock()
	defer r.mu.Unlock()

	r.Users[user] = true
	r.UsersById[user.ID] = user
}

func (r *Room) RemoveUser(user *User) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.Users, user)
	delete(r.UsersById, user.ID)
}

func (r *Room) GetUserById(id uuid.UUID) *User {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.UsersById[id]
}

func (r *Room) IsEmpty() bool {
	return len(r.Users) == 0
}

func (r *Room) DisplayNameUnique(displayName string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

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
