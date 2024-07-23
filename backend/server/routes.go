package server

import (
	"github.com/0xlaurens/filefa.st/handler"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"log"
)

func (s *Server) SetupRoutes(wh *handler.WebsocketHandler) {
	api := s.app.Group("/api")

	api.Use("/websocket", wh.UpgradeWebsocket)

	api.Use("/websocket", websocket.New(func(conn *websocket.Conn) {
		err := wh.HandleWebsocket(conn)
		if err != nil {
			log.Println(err)
			return
		}
	}))

	api.Get("/health", func(ctx *fiber.Ctx) error {
		return ctx.SendStatus(fiber.StatusOK)
	})

}
