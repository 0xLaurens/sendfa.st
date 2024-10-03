package types

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/google/uuid"
)

type UserOption func(u *User)

type User struct {
	ID         uuid.UUID       `json:"id"`
	DeviceName string          `json:"device_name"`
	Connection *websocket.Conn `json:"-"`
	RoomId     uuid.UUID       `json:"-"`
}

func CreateUser(deviceName string, options ...UserOption) *User {
	user := &User{
		ID:         uuid.New(),
		DeviceName: deviceName,
		RoomId:     uuid.Nil,
	}

	for _, option := range options {
		option(user)
	}

	return user
}

func WithConnection(conn *websocket.Conn) UserOption {
	return func(u *User) {
		u.Connection = conn
	}
}

func (u *User) SetRoomId(id uuid.UUID) {
	u.RoomId = id
}
