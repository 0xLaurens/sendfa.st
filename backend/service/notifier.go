package service

import (
	"github.com/gofiber/contrib/websocket"
	"github.com/google/uuid"
)

type MessageNotifier interface {
	BroadcastMessage(sender *websocket.Conn, json interface{}, roomId uuid.UUID) error
	SendMessage(json interface{}, roomId, userId uuid.UUID) error
	SendToConnection(json interface{}, conn *websocket.Conn) error
}

var _ MessageNotifier = (*WebsocketNotifier)(nil)

type WebsocketNotifier struct {
	roomService RoomManagement
}

func NewWebsocketNotifier(roomService RoomManagement) *WebsocketNotifier {
	return &WebsocketNotifier{roomService: roomService}
}

func (w *WebsocketNotifier) BroadcastMessage(sender *websocket.Conn, json interface{}, roomId uuid.UUID) error {
	room, err := w.roomService.GetRoomById(roomId)
	if err != nil {
		return err
	}

	for user := range room.Users {
		if user.Connection == sender {
			continue
		}
		_ = user.Connection.WriteJSON(json)
	}
	return nil
}

func (w *WebsocketNotifier) SendToConnection(json interface{}, conn *websocket.Conn) error {
	return conn.WriteJSON(json)
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
