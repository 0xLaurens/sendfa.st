package main

import (
	"github.com/0xlaurens/filefa.st/server"
	"github.com/google/uuid"
	"log"
)

func main() {
	s := server.NewServer()
	defer s.Shutdown()

	log.Println(uuid.New())

	log.Fatal(s.Run())
}
