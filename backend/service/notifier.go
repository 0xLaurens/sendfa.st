package service

import "github.com/google/uuid"

type MessageNotifier interface {
	BroadcastMessage(json interface{}, roomId uuid.UUID) error
	SendMessage(json interface{}, roomId, userId uuid.UUID) error
}

var _ MessageNotifier = (*WebsocketNotifier)(nil)

type WebsocketNotifier struct {
	roomService RoomManagement
}

func NewWebsocketNotifier(roomService RoomManagement) *WebsocketNotifier {
	return &WebsocketNotifier{roomService: roomService}
}

func (w *WebsocketNotifier) BroadcastMessage(json interface{}, roomId uuid.UUID) error {
	room, err := w.roomService.GetRoomById(roomId)
	if err != nil {
		return err
	}

	for user := range room.Users {
		_ = user.Connection.WriteJSON(json)
	}
	return nil
}

func (w *WebsocketNotifier) SendMessage(json interface{}, roomId, userId uuid.UUID) error {
	room, err := w.roomService.GetRoomById(roomId)
	if err != nil {
		return err
	}

	user, err := room.GetUserById(userId)
	if err != nil {
		return err
	}

	return user.Connection.WriteJSON(json)
}
