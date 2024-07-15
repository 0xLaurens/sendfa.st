package service

import (
	"errors"
	"github.com/0xlaurens/filefa.st/store"
	"github.com/0xlaurens/filefa.st/types"
	"github.com/google/uuid"
)

type RoomManagement interface {
	GetRoomById(id uuid.UUID) (*types.Room, error)
	GetRoomByCode(code string) (*types.Room, error)

	JoinRoom(code string, user *types.User) (*types.Room, error)
	LeaveRoom(code string, user *types.User) (*types.Room, error)

	CreateRoom() (*types.Room, error)
	DeleteRoom(id uuid.UUID) error
}

type RoomService struct {
	store       store.RoomStore
	codeService CodeManagement
}

var _ RoomManagement = (*RoomService)(nil)

func NewRoomService(store store.RoomStore) *RoomService {
	return &RoomService{store: store}
}

func (r RoomService) GetRoomById(id uuid.UUID) (*types.Room, error) {
	room, err := r.store.GetRoomById(id)
	if err != nil {
		return nil, errors.New("room not found")
	}
	return room, nil
}

func (r RoomService) GetRoomByCode(code string) (*types.Room, error) {
	room, err := r.store.GetRoomByCode(code)
	if err != nil {
		return nil, errors.New("room not found")
	}
	return room, nil
}

func (r RoomService) JoinRoom(code string, user *types.User) (*types.Room, error) {
	room, err := r.store.GetRoomByCode(code)
	if err != nil {
		return nil, errors.New("room not found")
	}

	if !room.DisplayNameUnique(user.DisplayName) {
		return nil, errors.New("display name already in use")
	}

	room.AddUser(user)
	updatedRoom, err := r.store.UpdateRoom(room.ID, room)
	if err != nil {
		return nil, errors.New("could not join room")
	}

	return updatedRoom, nil
}

func (r RoomService) LeaveRoom(code string, user *types.User) (*types.Room, error) {
	room, err := r.store.GetRoomByCode(code)
	if err != nil {
		return nil, errors.New("room not found")
	}

	room.RemoveUser(user)
	user.RoomId = uuid.Nil

	updatedRoom, err := r.store.UpdateRoom(room.ID, room)
	if err != nil {
		return nil, errors.New("could not leave room")
	}

	return updatedRoom, nil
}

func (r RoomService) CreateRoom() (*types.Room, error) {
	code, err := r.codeService.GenerateCode()
	if err != nil {
		return nil, errors.New("could not generate code")
	}
	room := types.CreateRoom(code)
	err = r.store.CreateRoom(room)
	if err != nil {
		return nil, errors.New("could not create room")
	}

	return room, nil
}

func (r RoomService) DeleteRoom(id uuid.UUID) error {
	roomToDelete, err := r.store.GetRoomById(id)
	if err != nil {
		return errors.New("room not found")
	}

	if !roomToDelete.IsEmpty() {
		return errors.New("room is not empty")
	}

	err = r.store.DeleteRoom(id)
	return nil
}
