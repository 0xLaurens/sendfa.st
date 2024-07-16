package handler

import (
	"github.com/0xlaurens/filefa.st/service"
	"github.com/0xlaurens/filefa.st/types"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/mssola/user_agent"
	"log"
)

type WebsocketHandler struct {
	roomService service.RoomManagement
}

func NewWebsocketHandler(roomService service.RoomManagement) *WebsocketHandler {
	return &WebsocketHandler{
		roomService: roomService,
	}
}

func (wh *WebsocketHandler) UpgradeWebsocket(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		return c.Next()
	}
	return fiber.ErrUpgradeRequired
}

func (wh *WebsocketHandler) HandleWebsocket(conn *websocket.Conn) error {
	ua := user_agent.New(conn.Headers("User-Agent"))
	os := ua.OSInfo().Name

	user := types.CreateUser(os, types.WithConnection(conn))
	log.Printf("New user connected: %s\n", user.DisplayName)

	room, err := wh.roomService.CreateRoom()
	if err != nil {
		return err
	}

	_, err = wh.roomService.JoinRoom(room.Code, user)
	if err != nil {
		log.Println("Error joining room:", err)
		return err
	}
	defer func(roomService service.RoomManagement, code string, user *types.User) {
		_, err := roomService.LeaveRoom(code, user)
		if err != nil {
			log.Println("Error leaving room:", err)
			return
		}
	}(wh.roomService, room.Code, user)

	rooms := wh.roomService.GetAllRooms()
	log.Println("All rooms:", rooms)

	conn.WriteJSON(fiber.Map{
		"type": "USER_CONNECTED",
		"user": user,
	})

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Error reading message:", err)
			break
		}

		log.Printf("%s: %s", user.DisplayName, string(msg))
	}
	return nil
}
