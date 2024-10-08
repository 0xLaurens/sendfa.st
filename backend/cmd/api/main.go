package main

import (
	"github.com/0xlaurens/filefa.st/handler"
	"github.com/0xlaurens/filefa.st/server"
	"github.com/0xlaurens/filefa.st/service"
	"github.com/0xlaurens/filefa.st/store"
	"log"
)

func main() {
	s := server.NewServer(server.WithDevelopmentMode())
	defer log.Fatal(s.Shutdown())

	websocketHandler := SetupWebsocketHandler()
	s.SetupRoutes(websocketHandler)

	log.Fatal(s.Run())
}

func SetupWebsocketHandler() *handler.WebsocketHandler {
	roomStore := store.NewRoomStoreInMemory()
	userService := service.NewUserService()
	roomService := service.NewRoomService(roomStore)
	return handler.NewWebsocketHandler(roomService, userService)
}
