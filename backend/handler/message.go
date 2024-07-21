package handler

import (
	"encoding/json"
	"github.com/0xlaurens/filefa.st/service"
	"github.com/0xlaurens/filefa.st/types"
	"github.com/gofiber/contrib/websocket"
	"log"
)

type messageHandler func(c *websocket.Conn, notifier service.MessageNotifier, message types.Message) error

var responseMap = map[string]messageHandler{
	types.Offer:       handleOffer,
	types.Answer:      handleAnswer,
	types.Candidate:   handleCandidate,
	types.JoinRoom:    handleJoinRoom,
	types.LeaveRoom:   handleLeaveRoom,
	types.RequestRoom: handleRequestRoom,
	types.RoomExists:  handleRoomExists,
}

type MessageHandler struct {
	notifier service.MessageNotifier
}

func NewMessageHandler(notifier service.MessageNotifier) *MessageHandler {
	return &MessageHandler{
		notifier: notifier,
	}
}

func (mh *MessageHandler) handleResponse(c *websocket.Conn, message types.Message) error {
	handler, ok := responseMap[message.Type]
	if !ok {
		return nil
	}
	return handler(c, mh.notifier, message)
}

func handleOffer(c *websocket.Conn, notifier service.MessageNotifier, message types.Message) error {
	//msg, ok := raw.(types.OfferAnswerMessage)
	//if !ok {
	//	log.Println("Could not cast to OfferAnswerMessage")
	//	return nil
	//}
	//
	//notifier.SendMessage(msg, msg.RoomID, msg.To)

	return nil
}

func handleAnswer(c *websocket.Conn, notifier service.MessageNotifier, message types.Message) error {
	//msg, ok := raw.(types.OfferAnswerMessage)
	//if !ok {
	//	log.Println("Could not cast to OfferAnswerMessage")
	//	return nil
	//}
	//
	//return notifier.SendMessage(msg, msg.RoomID, msg.To)
	return nil
}

func handleCandidate(c *websocket.Conn, notifier service.MessageNotifier, message types.Message) error {
	//msg, ok := raw.(types.CandidateMessage)
	//if !ok {
	//	log.Println("Could not cast to CandidateMessage")
	//	return nil
	//}
	//
	//return notifier.BroadcastMessage(msg, msg.RoomID)
	return nil
}

func handleJoinRoom(c *websocket.Conn, notifier service.MessageNotifier, message types.Message) error {
	var joinPayload types.JoinPayload
	if err := json.Unmarshal(message.Payload, &joinPayload); err != nil {
		log.Println("Failed to unmarshall the join message", err)
	}
	log.Printf("Received join payload: %s\n", joinPayload)

	// get room
	// add user to room
	// send message to user
	// send message to all other users that user has joined
	return nil
}

func handleLeaveRoom(c *websocket.Conn, notifier service.MessageNotifier, message types.Message) error {
	//TODO: Implement
	panic("implement me")
}

func handleRequestRoom(c *websocket.Conn, notifier service.MessageNotifier, message types.Message) error {
	//TODO: Implement
	panic("implement me")
}

func handleRoomExists(c *websocket.Conn, notifier service.MessageNotifier, message types.Message) error {
	//TODO: Implement
	panic("implement me")
}

func handleUnknown(c *websocket.Conn, notifier service.MessageNotifier, message types.Message) error {
	log.Println("Unknown message type")
	return nil
}
