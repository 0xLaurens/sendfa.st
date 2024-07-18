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
	roomService    service.RoomManagement
	messageHandler *MessageHandler
}

func NewWebsocketHandler(roomService service.RoomManagement) *WebsocketHandler {
	return &WebsocketHandler{
		roomService:    roomService,
		messageHandler: NewMessageHandler(service.NewWebsocketNotifier(roomService)),
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
	log.Println("User connected:", user.ID)

	defer conn.Close()

	conn.WriteJSON(fiber.Map{
		"type": "IDENTITY",
		"user": user,
	})

	for {
		var raw interface{}
		err := conn.ReadJSON(&raw)
		if err != nil {
			log.Println("Error reading message:", err)
			break
		}
		req := raw.(types.Message)

		err = wh.messageHandler.handleResponse(conn, req.Type, raw)
		if err != nil {
			return err
		}
	}

	return nil
}
