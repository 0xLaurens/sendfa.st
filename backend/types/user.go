package types

import (
	"github.com/0xlaurens/filefa.st/utils"
	"github.com/fasthttp/websocket"
	"github.com/google/uuid"
)

type UserOption func(u *User)

type User struct {
	ID          uuid.UUID       `json:"id"`
	DisplayName string          `json:"display_name"`
	DeviceName  string          `json:"device_name"`
	Connection  *websocket.Conn `json:"-"`
	RoomId      uuid.UUID       `json:"-"`
}

func CreateUser(deviceName string, options ...UserOption) *User {
	user := &User{
		ID:          uuid.New(),
		DisplayName: utils.GenerateRandomDisplayName(),
		DeviceName:  deviceName,
	}

	for _, option := range options {
		option(user)
	}

	return user
}

func WithDisplayName(displayName string) UserOption {
	return func(u *User) {
		u.DisplayName = displayName
	}
}

func WithConnection(conn *websocket.Conn) UserOption {
	return func(u *User) {
		u.Connection = conn
	}
}

func (u *User) SetRoomId(id uuid.UUID) {
	u.RoomId = id
}
