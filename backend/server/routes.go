package server

import (
	"github.com/0xlaurens/filefa.st/handler"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"log"
)

func (s *Server) SetupRoutes(wh *handler.WebsocketHandler) {
	s.app.Use("/ws", wh.UpgradeWebsocket)

	s.app.Use("/ws", websocket.New(func(conn *websocket.Conn) {
		err := wh.HandleWebsocket(conn)
		if err != nil {
			log.Println(err)
			return
		}
	}))

	s.app.Get("/health", func(ctx *fiber.Ctx) error {
		return ctx.SendStatus(fiber.StatusOK)
	})

}
