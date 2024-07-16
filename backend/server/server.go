package server

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
	"log"
	"strconv"
)

type Server struct {
	app             *fiber.App
	port            int
	developmentMode bool
}

func NewServer(opts ...Options) *Server {
	server := &Server{
		app:  fiber.New(),
		port: 7331,
	}

	for _, opt := range opts {
		opt(server)
	}

	return server
}

func (s *Server) Run() error {
	port := fmt.Sprintf(":%s", strconv.Itoa(s.port))
	log.Printf("Server running on port %s", port)
	return s.app.Listen(port)
}

func (s *Server) Shutdown() error {
	return s.app.Shutdown()
}
