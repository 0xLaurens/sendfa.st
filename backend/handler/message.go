package handler

import (
	"github.com/0xlaurens/filefa.st/service"
	"github.com/gofiber/contrib/websocket"
)

type messageHandler func(c *websocket.Conn) (string, error)

var responseMap = map[string]messageHandler{
	"OFFER":             handleOffer,
	"ANSWER":            handleAnswer,
	"CANDIDATE":         handleCandidate,
	"USER_CONNECTED":    handleUserConnected,
	"USER_DISCONNECTED": handleUserDisconnected,
}

type MessageHandler struct {
	notifier service.MessageNotifier
}

func NewMessageHandler(notifier service.MessageNotifier) *MessageHandler {
	return &MessageHandler{
		notifier: notifier,
	}
}

func (mh *MessageHandler) handleResponse(c *websocket.Conn, msg string) {
	handler, ok := responseMap[msg]
	if !ok {
		return
	}
	_, _ = handler(c)
	return
}

func handleOffer(c *websocket.Conn) (string, error) {
	//TODO: Implement
	panic("implement me")
}

func handleUserDisconnected(c *websocket.Conn) (string, error) {
	//TODO: Implement
	panic("implement me")
}

func handleUserConnected(c *websocket.Conn) (string, error) {
	//TODO: Implement
	panic("implement me")
}

func handleCandidate(c *websocket.Conn) (string, error) {
	//TODO: Implement
	panic("implement me")
}

func handleAnswer(c *websocket.Conn) (string, error) {
	//TODO: Implement
	panic("implement me")
}
