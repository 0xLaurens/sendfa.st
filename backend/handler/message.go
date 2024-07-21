package handler

import (
	"encoding/json"
	"errors"
	"github.com/0xlaurens/filefa.st/service"
	"github.com/0xlaurens/filefa.st/types"
	"github.com/gofiber/contrib/websocket"
	"log"
)

type MessageHandler struct {
	notifier service.MessageNotifier
}

func NewMessageHandler(notifier service.MessageNotifier) *MessageHandler {
	return &MessageHandler{
		notifier: notifier,
	}
}

func (mh *MessageHandler) handleResponse(c *websocket.Conn, message types.Message) error {
	switch message.Type {
	case types.JoinRoom:
		return mh.handleJoinRoom(c, message)
	case types.LeaveRoom:
		return mh.handleLeaveRoom(c, message)
	case types.Offer:
		return mh.handleOffer(c, message)
	case types.Answer:
		return mh.handleAnswer(c, message)
	case types.Candidate:
		return mh.handleCandidate(c, message)
	case types.RoomExists:
		return mh.handleRoomExists(c, message)
	case types.RequestRoom:
		return mh.handleRequestRoom(c, message)

	default:
		log.Println("Unknown message type received", message.Type)
		return errors.New("unknown message type")
	}
}

func (mh *MessageHandler) handleOffer(c *websocket.Conn, message types.Message) error {
	//msg, ok := raw.(types.OfferAnswerMessage)
	//if !ok {
	//	log.Println("Could not cast to OfferAnswerMessage")
	//	return nil
	//}
	//
	//notifier.SendMessage(msg, msg.RoomID, msg.To)

	return nil
}

func (mh *MessageHandler) handleAnswer(c *websocket.Conn, message types.Message) error {
	//msg, ok := raw.(types.OfferAnswerMessage)
	//if !ok {
	//	log.Println("Could not cast to OfferAnswerMessage")
	//	return nil
	//}
	//
	//return notifier.SendMessage(msg, msg.RoomID, msg.To)
	return nil
}

func (mh *MessageHandler) handleCandidate(c *websocket.Conn, message types.Message) error {
	//msg, ok := raw.(types.CandidateMessage)
	//if !ok {
	//	log.Println("Could not cast to CandidateMessage")
	//	return nil
	//}
	//
	//return notifier.BroadcastMessage(msg, msg.RoomID)
	return nil
}

func (mh *MessageHandler) handleJoinRoom(c *websocket.Conn, message types.Message) error {
	var joinPayload types.JoinPayload
	if err := json.Unmarshal(message.Payload, &joinPayload); err != nil {
		log.Println("Failed to unmarshall the join message", err)
	}
	log.Printf("Received join payload: %v\n", joinPayload)

	// get room
	// add user to room
	// send message to user
	// send message to all other users that user has joined
	return nil
}

func (mh *MessageHandler) handleLeaveRoom(c *websocket.Conn, message types.Message) error {
	//TODO: Implement
	panic("implement me")
}

func (mh *MessageHandler) handleRequestRoom(c *websocket.Conn, message types.Message) error {
	//TODO: Implement
	panic("implement me")
}

func (mh *MessageHandler) handleRoomExists(c *websocket.Conn, message types.Message) error {
	//TODO: Implement
	panic("implement me")
}

func (mh *MessageHandler) handleUnknown(c *websocket.Conn, message types.Message) error {
	log.Println("Unknown message type")
	return nil
}
