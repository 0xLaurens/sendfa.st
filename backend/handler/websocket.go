package handler

import (
	"encoding/json"
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
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return err
		}

		var message types.Message
		if err = json.Unmarshal(msg, &message); err != nil {
			log.Println(err)
			continue
		}

		if err = wh.messageHandler.handleResponse(conn, message); err != nil {
			return err
		}
	}
}
