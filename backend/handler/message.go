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
	userService service.UserManagement
}

func NewMessageHandler(notifier service.MessageNotifier, roomService service.RoomManagement, userService service.UserManagement) *MessageHandler {
	return &MessageHandler{
		notifier:    notifier,
		roomService: roomService,
		userService: userService,
	}
}

func (mh *MessageHandler) handleResponse(c *websocket.Conn, message types.Message) error {
	switch message.Type {
	case types.CancelDownload:
		return mh.handleCancelDownload(c, message)
	case types.JoinRoom:
		return mh.handleJoinRoom(c, message)
	case types.LeaveRoom:
		return mh.handleLeaveRoom(c, message)
	case types.RoomExists:
		return mh.handleRoomExists(c, message)
	case types.RequestRoom:
		return mh.handleRequestRoom(c, message)
	case types.Answer, types.IceCandidate, types.Offer:
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
	log.Println("Received webrtc message", roomIdPayload)

	return mh.notifier.BroadcastMessage(c, message, roomIdPayload.RoomID)
}

func (mh *MessageHandler) handleJoinRoom(c *websocket.Conn, message types.Message) error {
	log.Printf("Received join room message, handling it %v", message)
	var roomIdPayload types.RoomIdPayload
	if err := json.Unmarshal(message.Payload, &roomIdPayload); err != nil {
		log.Println("Failed to unmarshall the join message", err)
	}
	log.Printf("Received join payload: %v", roomIdPayload)

	user, err := mh.userService.GetUserByConn(c)
	if err != nil {
		return err
	}

	room, err := mh.roomService.JoinRoom(roomIdPayload.RoomID, user)
	if err != nil {
		return err
	}

	err = mh.notifier.SendToConnection(fiber.Map{
		"type":  "ROOM_JOINED",
		"room":  room,
		"users": room.GetUsers(),
	}, c)
	if err != nil {
		return err
	}

	return mh.notifier.BroadcastMessage(c, fiber.Map{
		"type": "USER_JOINED",
		"user": user,
	}, room.ID)
}

func (mh *MessageHandler) handleLeaveRoom(c *websocket.Conn, message types.Message) error {
	var leavePayload types.RoomIdPayload
	if err := json.Unmarshal(message.Payload, &leavePayload); err != nil {
		log.Println("Failed to unmarshall the leave message", err)
	}
	log.Printf("Received leave payload: %v", leavePayload)

	user, err := mh.userService.GetUserByConn(c)
	if err != nil {
		return err
	}

	room, err := mh.roomService.LeaveRoom(leavePayload.RoomID, user)
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
		"user": user,
	}, room.ID)
}

func (mh *MessageHandler) handleRequestRoom(c *websocket.Conn, message types.Message) error {
	room, err := mh.roomService.CreateRoom()
	if err != nil {
		return err
	}

	user, err := mh.userService.GetUserByConn(c)
	if err != nil {
		return err
	}
	_, _ = mh.roomService.JoinRoom(room.ID, user)

	return mh.notifier.SendToConnection(fiber.Map{
		"type": "ROOM_CREATED",
		"room": room,
	}, c)
}

func (mh *MessageHandler) handleRoomExists(c *websocket.Conn, message types.Message) error {
	var roomIdPayload types.RoomIdPayload
	if err := json.Unmarshal(message.Payload, &roomIdPayload); err != nil {
		log.Println("Failed to unmarshall the room exists message", err)
	}
	log.Printf("Received room exists payload: %v", roomIdPayload)

	_, err := mh.roomService.GetRoomById(roomIdPayload.RoomID)
	if err != nil {
		return mh.notifier.SendToConnection(fiber.Map{
			"type":   "ROOM_EXISTS",
			"roomId": roomIdPayload.RoomID,
			"exists": false,
		}, c)
	}

	return mh.notifier.SendToConnection(fiber.Map{
		"type":   "ROOM_EXISTS",
		"roomId": roomIdPayload.RoomID,
		"exists": true,
	}, c)
}

func (mh *MessageHandler) handleCancelDownload(c *websocket.Conn, message types.Message) error {
	var roomIdPayload types.RoomIdPayload
	if err := json.Unmarshal(message.Payload, &roomIdPayload); err != nil {
		log.Println("Failed to unmarshall the cancel download message", err)
		return err
	}
	return mh.notifier.BroadcastMessage(c, message, roomIdPayload.RoomID)
}
