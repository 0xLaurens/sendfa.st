package service

import (
	"errors"
	"github.com/0xlaurens/filefa.st/store"
	"github.com/0xlaurens/filefa.st/types"
	"github.com/google/uuid"
)

var (
	ErrorRoomNotFound       = errors.New("room not found")
	ErrorRoomNotEmpty       = errors.New("room is not empty")
	ErrorDisplayNameInUse   = errors.New("display name already in use")
	ErrorCouldNotJoinRoom   = errors.New("could not join room")
	ErrorCouldNotLeaveRoom  = errors.New("could not leave room")
	ErrorCouldNotCreateRoom = errors.New("could not create room")
	ErrorGenerateCode       = errors.New("could not generate unique code")
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

func NewRoomService(store store.RoomStore, codeService CodeManagement) *RoomService {
	return &RoomService{store, codeService}
}

func (r RoomService) GetRoomById(id uuid.UUID) (*types.Room, error) {
	room, err := r.store.GetRoomById(id)
	if err != nil {
		return nil, ErrorRoomNotFound
	}
	return room, nil
}

func (r RoomService) GetRoomByCode(code string) (*types.Room, error) {
	room, err := r.store.GetRoomByCode(code)
	if err != nil {
		return nil, ErrorRoomNotFound
	}
	return room, nil
}

func (r RoomService) JoinRoom(code string, user *types.User) (*types.Room, error) {
	room, err := r.store.GetRoomByCode(code)
	if err != nil {
		return nil, ErrorRoomNotFound
	}

	if !room.DisplayNameUnique(user.DisplayName) {
		return nil, ErrorDisplayNameInUse
	}

	room.AddUser(user)
	updatedRoom, err := r.store.UpdateRoom(room.ID, room)
	if err != nil {
		return nil, ErrorCouldNotJoinRoom
	}

	return updatedRoom, nil
}

func (r RoomService) LeaveRoom(code string, user *types.User) (*types.Room, error) {
	room, err := r.store.GetRoomByCode(code)
	if err != nil {
		return nil, ErrorRoomNotFound
	}

	room.RemoveUser(user)
	user.RoomId = uuid.Nil

	updatedRoom, err := r.store.UpdateRoom(room.ID, room)
	if err != nil {
		return nil, ErrorCouldNotLeaveRoom
	}

	return updatedRoom, nil
}

func (r RoomService) CreateRoom() (*types.Room, error) {
	code, err := r.codeService.GenerateCode()
	if err != nil {
		return nil, ErrorGenerateCode
	}
	room := types.CreateRoom(code)
	err = r.store.CreateRoom(room)
	if err != nil {
		return nil, ErrorCouldNotCreateRoom
	}

	return room, nil
}

func (r RoomService) DeleteRoom(id uuid.UUID) error {
	roomToDelete, err := r.store.GetRoomById(id)
	if err != nil {
		return ErrorRoomNotFound
	}

	if !roomToDelete.IsEmpty() {
		return ErrorRoomNotEmpty
	}

	err = r.store.DeleteRoom(id)
	return nil
}
