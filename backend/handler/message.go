package handler

import (
	"github.com/0xlaurens/filefa.st/service"
	"github.com/0xlaurens/filefa.st/types"
	"github.com/gofiber/contrib/websocket"
	"log"
)

type messageHandler func(c *websocket.Conn, notifier service.MessageNotifier, raw interface{}) error

var responseMap = map[string]messageHandler{
	types.Offer:       handleOffer,
	types.Answer:      handleAnswer,
	types.Candidate:   handleCandidate,
	types.JoinRoom:    handleJoinRoom,
	types.LeaveRoom:   handleLeaveRoom,
	types.RequestRoom: handleRequestRoom,
	types.RoomExists:  handleRoomExists,
	_:                 handleUnknown,
}

type MessageHandler struct {
	notifier service.MessageNotifier
}

func NewMessageHandler(notifier service.MessageNotifier) *MessageHandler {
	return &MessageHandler{
		notifier: notifier,
	}
}

func (mh *MessageHandler) handleResponse(c *websocket.Conn, reqType string, raw interface{}) error {
	handler, ok := responseMap[reqType]
	if !ok {
		return nil
	}
	return handler(c, mh.notifier, raw)
}

func handleOffer(c *websocket.Conn, notifier service.MessageNotifier, raw interface{}) error {
	msg, ok := raw.(types.OfferAnswerMessage)
	if !ok {
		log.Println("Could not cast to OfferAnswerMessage")
		return nil
	}

	notifier.SendMessage(msg, msg.RoomID, msg.To)

	return nil
}

func handleAnswer(c *websocket.Conn, notifier service.MessageNotifier, raw interface{}) error {
	msg, ok := raw.(types.OfferAnswerMessage)
	if !ok {
		log.Println("Could not cast to OfferAnswerMessage")
		return nil
	}

	return notifier.SendMessage(msg, msg.RoomID, msg.To)
}

func handleCandidate(c *websocket.Conn, notifier service.MessageNotifier, raw interface{}) error {
	msg, ok := raw.(types.CandidateMessage)
	if !ok {
		log.Println("Could not cast to CandidateMessage")
		return nil
	}

	return notifier.BroadcastMessage(msg, msg.RoomID)
}

func handleJoinRoom(c *websocket.Conn, notifier service.MessageNotifier, raw interface{}) error {
	_, ok := raw.(types.JoinRoomMessage)
	if !ok {
		log.Println("Could not cast to JoinRoomMessage")
		return nil
	}
	// get room
	// add user to room
	// send message to user
	// send message to all other users that user has joined
	return nil
}

func handleLeaveRoom(c *websocket.Conn, notifier service.MessageNotifier, raw interface{}) error {
	//TODO: Implement
	panic("implement me")
}

func handleRequestRoom(c *websocket.Conn, notifier service.MessageNotifier, raw interface{}) error {
	//TODO: Implement
	panic("implement me")
}

func handleRoomExists(c *websocket.Conn, notifier service.MessageNotifier, raw interface{}) error {
	//TODO: Implement
	panic("implement me")
}

func handleUnknown(c *websocket.Conn, notifier service.MessageNotifier, raw interface{}) error {
	log.Println("Unknown message type")
	return nil
}
