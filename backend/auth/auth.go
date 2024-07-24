package auth

import (
	"fmt"
	"github.com/0xlaurens/filefa.st/config"
	"github.com/0xlaurens/filefa.st/types"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"log"
)

// ParseToken parses a JWT token string and returns the token object
func ParseToken(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		if token.Method.Alg() != "HS256" {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		return []byte(config.Config("JWT_SECRET")), nil
	})
}

func validateProAccount(token *jwt.Token) bool {
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return false
	}

	role := claims["user_role"]
	return role == "pro"
}

// Protected is a middleware that checks if the request is authorized
func Protected(handler func(conn *websocket.Conn, message types.Message) error) func(conn *websocket.Conn, message types.Message) error {
	return func(conn *websocket.Conn, message types.Message) error {
		authHeader := conn.Headers("Authorization")
		token, err := ParseToken(authHeader)
		if err != nil {
			conn.WriteJSON(fiber.Map{"type": "AUTH", "error": "unauthorized"})
			log.Println("Failed to parse token", err)
			return fmt.Errorf("unauthorized")
		}

		if !validateProAccount(token) {
			conn.WriteJSON(fiber.Map{"type": "AUTH", "error": "not a pro account"})
			return fmt.Errorf("unauthorized")
		}

		return handler(conn, message)
	}
}
