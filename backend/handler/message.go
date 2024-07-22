package handler

import (
	"encoding/json"
	"errors"
	"github.com/0xlaurens/filefa.st/service"
	"github.com/0xlaurens/filefa.st/types"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"log"
)

type MessageHandler struct {
	notifier    service.MessageNotifier
	roomService service.RoomManagement
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
	case types.RoomExists:
		return mh.handleRoomExists(c, message)
	case types.RequestRoom:
		return mh.handleRequestRoom(c, message)
	case types.Answer, types.Candidate, types.Offer:
		return mh.handleWebrtcMessage(c, message)

	default:
		log.Println("Unknown message type received", message.Type)
		return errors.New("unknown message type")
	}
}

func (mh *MessageHandler) handleWebrtcMessage(c *websocket.Conn, message types.Message) error {
	var roomIdPayload types.RoomIdPayload
	if err := json.Unmarshal(message.Payload, &roomIdPayload); err != nil {
		log.Println("Failed to unmarshall the room id from the payload", err)
		return err
	}

	return mh.notifier.BroadcastMessage(c, message, roomIdPayload.RoomID)
}

func (mh *MessageHandler) handleJoinRoom(c *websocket.Conn, message types.Message) error {
	var joinPayload types.JoinLeavePayload
	if err := json.Unmarshal(message.Payload, &joinPayload); err != nil {
		log.Println("Failed to unmarshall the join message", err)
	}
	log.Printf("Received join payload: %v", joinPayload)

	room, err := mh.roomService.JoinRoom(joinPayload.Code, &joinPayload.User)
	if err != nil {
		return err
	}

	err = mh.notifier.SendToConnection(fiber.Map{
		"type": "ROOM_JOINED",
		"room": room,
	}, c)
	if err != nil {
		return err
	}

	return mh.notifier.BroadcastMessage(c, fiber.Map{
		"type": "USER_JOINED",
		"user": joinPayload.User,
	}, room.ID)
}

func (mh *MessageHandler) handleLeaveRoom(c *websocket.Conn, message types.Message) error {
	var leavePayload types.JoinLeavePayload
	if err := json.Unmarshal(message.Payload, &leavePayload); err != nil {
		log.Println("Failed to unmarshall the leave message", err)
	}
	log.Printf("Received leave payload: %v", leavePayload)

	room, err := mh.roomService.LeaveRoom(leavePayload.Code, &leavePayload.User)
	if err != nil {
		return err
	}

	err = mh.notifier.SendToConnection(fiber.Map{
		"type": "ROOM_LEFT",
		"room": room,
	}, c)
	if err != nil {
		return err
	}

	return mh.notifier.BroadcastMessage(c, fiber.Map{
		"type": "USER_LEFT",
		"user": leavePayload.User,
	}, room.ID)
}

func (mh *MessageHandler) handleRequestRoom(c *websocket.Conn, message types.Message) error {
	room, err := mh.roomService.CreateRoom()
	if err != nil {
		return err
	}

	return mh.notifier.SendToConnection(fiber.Map{
		"type": "ROOM_CREATED",
		"room": room,
	}, c)
}

func (mh *MessageHandler) handleRoomExists(c *websocket.Conn, message types.Message) error {
	var roomExistsPayload types.RoomExistsPayload
	if err := json.Unmarshal(message.Payload, &roomExistsPayload); err != nil {
		log.Println("Failed to unmarshall the room exists message", err)
	}
	log.Printf("Received room exists payload: %v", roomExistsPayload)

	_, err := mh.roomService.GetRoomByCode(roomExistsPayload.Code)
	if err != nil {
		// room does not exist
		return mh.notifier.SendToConnection(fiber.Map{
			"type":   "ROOM_EXISTS",
			"exists": false,
		}, c)
	}

	return mh.notifier.SendToConnection(fiber.Map{
		"type":   "ROOM_EXISTS",
		"exists": true,
	}, c)
}
