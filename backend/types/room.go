package types

import (
	"errors"
	"github.com/google/uuid"
	"sync"
)

var (
	ErrorUserNotFound = errors.New("user not found")
)

type RoomOptions func(r *Room)

type Room struct {
	ID        uuid.UUID           `json:"id"`
	UserCount uint8               `json:"user_count"`
	Users     map[*User]bool      `json:"-"`
	UsersById map[uuid.UUID]*User `json:"-"`
	mu        sync.RWMutex
}

func CreateRoom(options ...RoomOptions) *Room {
	room := &Room{
		ID:        uuid.New(),
		UserCount: 0,
		Users:     make(map[*User]bool),
		UsersById: make(map[uuid.UUID]*User),
	}

	for _, option := range options {
		option(room)
	}

	return room
}

func (r *Room) AddUser(user *User) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.UserCount++
	r.Users[user] = true
	r.UsersById[user.ID] = user
}

func (r *Room) RemoveUser(user *User) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.UserCount--
	delete(r.Users, user)
	delete(r.UsersById, user.ID)
}

func (r *Room) GetUserById(id uuid.UUID) (*User, error) {
	var user *User
	r.mu.RLock()
	defer r.mu.RUnlock()

	user, ok := r.UsersById[id]
	if !ok {
		return nil, ErrorUserNotFound
	}

	return user, nil
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

func (r *Room) GetUsers() []User {
	var users []User

	r.mu.RLock()
	defer r.mu.RUnlock()

	for user := range r.Users {
		users = append(users, *user)
	}

	return users
}
