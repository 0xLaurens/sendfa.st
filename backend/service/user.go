package service

import (
	"github.com/0xlaurens/filefa.st/types"
	"github.com/gofiber/contrib/websocket"
	"github.com/google/uuid"
	"sync"
)

type UserManagement interface {
	RegisterUser(user *types.User) error
	DeleteUser(user *types.User) error
	DeleteUserById(id uuid.UUID) error
	GetUserById(id uuid.UUID) (*types.User, error)
	GetUserByConn(conn *websocket.Conn) (*types.User, error)
	GetAllUsers() []*types.User
}

type UserService struct {
	usersById   map[uuid.UUID]*types.User
	usersByConn map[*websocket.Conn]*types.User
	mu          sync.RWMutex
}

func NewUserService() *UserService {
	return &UserService{
		usersById:   make(map[uuid.UUID]*types.User),
		usersByConn: make(map[*websocket.Conn]*types.User),
	}
}

func (u *UserService) RegisterUser(user *types.User) error {
	u.mu.Lock()
	defer u.mu.Unlock()

	u.usersById[user.ID] = user
	u.usersByConn[user.Connection] = user
	return nil
}

func (u *UserService) DeleteUser(user *types.User) error {
	u.mu.Lock()
	defer u.mu.Unlock()

	delete(u.usersById, user.ID)
	delete(u.usersByConn, user.Connection)
	return nil
}

func (u *UserService) DeleteUserById(id uuid.UUID) error {
	u.mu.Lock()
	defer u.mu.Unlock()

	user, ok := u.usersById[id]
	if !ok {
		return types.ErrorUserNotFound
	}
	delete(u.usersById, id)
	delete(u.usersByConn, user.Connection)
	return nil
}

func (u *UserService) GetUserById(id uuid.UUID) (*types.User, error) {
	u.mu.RLock()
	defer u.mu.RUnlock()

	user, ok := u.usersById[id]
	if !ok {
		return nil, types.ErrorUserNotFound
	}
	return user, nil
}

func (u *UserService) GetUserByConn(conn *websocket.Conn) (*types.User, error) {
	u.mu.RLock()
	defer u.mu.RUnlock()

	user, ok := u.usersByConn[conn]
	if !ok {
		return nil, types.ErrorUserNotFound
	}
	return user, nil
}

func (u *UserService) GetAllUsers() []*types.User {
	var users []*types.User
	for _, user := range u.usersById {
		users = append(users, user)
	}
	return users
}
