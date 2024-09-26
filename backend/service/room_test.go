package service

import (
	"github.com/0xlaurens/filefa.st/store"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"testing"
)

func SetupRoomService() RoomManagement {
	roomStore := store.NewRoomStoreInMemory()
	return NewRoomService(roomStore)
}

func TestRoomService_CreateRoom(t *testing.T) {
	roomService := SetupRoomService()

	room, err := roomService.CreateRoom()
	assert.NoError(t, err)
	assert.NotNil(t, room)
}

func TestRoomService_GetRoomById(t *testing.T) {
	roomService := SetupRoomService()

	room, err := roomService.CreateRoom()
	assert.NoError(t, err)
	assert.NotNil(t, room)

	room2, err := roomService.GetRoomById(room.ID)
	assert.NoError(t, err)
	assert.NotNil(t, room2)
	assert.Equal(t, room, room2)
}

func TestRoomService_GetById_ThrowsRoomNotFoundError(t *testing.T) {
	roomService := SetupRoomService()

	_, err := roomService.GetRoomById(uuid.Nil)
	assert.Error(t, err)
	assert.Equal(t, ErrorRoomNotFound, err)
}
