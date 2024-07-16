package server

import "github.com/gofiber/fiber/v2"

type Options func(s *Server)

func WithPort(port int) Options {
	return func(s *Server) {
		s.port = port
	}
}

func WithFiberConfig(config fiber.Config) Options {
	return func(s *Server) {
		s.app = fiber.New(config)
	}
}
