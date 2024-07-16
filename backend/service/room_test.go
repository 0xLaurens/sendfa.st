package service

import (
	"github.com/0xlaurens/filefa.st/store"
	"github.com/0xlaurens/filefa.st/types"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"testing"
)

func SetupRoomService() RoomManagement {
	roomStore := store.NewRoomStoreInMemory()
	codeStore := store.NewCodeStoreInMemory()
	codeService := NewCodeService(codeStore)
	return NewRoomService(roomStore, codeService)
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

func TestRoomService_GetRoomByCode(t *testing.T) {
	roomService := SetupRoomService()

	room, err := roomService.CreateRoom()
	assert.NoError(t, err)
	assert.NotNil(t, room)

	room2, err := roomService.GetRoomByCode(room.Code)
	assert.NoError(t, err)
	assert.NotNil(t, room2)
	assert.Equal(t, room, room2)
}

func TestRoomService_GetByCode_ThrowsRoomNotFoundError(t *testing.T) {
	roomService := SetupRoomService()

	_, err := roomService.GetRoomByCode("non-existing")
	assert.Error(t, err)
	assert.Equal(t, ErrorRoomNotFound, err)
}

func TestRoomService_JoinRoom(t *testing.T) {
	roomService := SetupRoomService()

	room, err := roomService.CreateRoom()
	assert.NoError(t, err)
	assert.NotNil(t, room)

	user := types.CreateUser("Linux")

	room2, err := roomService.JoinRoom(room.Code, user)
	assert.NoError(t, err)
	assert.NotNil(t, room2)
	assert.Equal(t, room, room2)
	assert.Equal(t, 1, len(room2.Users))
}

func TestRoomService_JoinRoom_ThrowsRoomNotFoundError(t *testing.T) {
	roomService := SetupRoomService()

	user := types.CreateUser("Android")

	_, err := roomService.JoinRoom("non-existing", user)
	assert.Error(t, err)
	assert.Equal(t, ErrorRoomNotFound, err)
}

func TestRoomService_JoinRoom_ThrowsDisplayNameInUseError(t *testing.T) {
	roomService := SetupRoomService()
	user := types.CreateUser("Android")
	user.DisplayName = "not-unique"
	user2 := types.CreateUser("IOS")
	user2.DisplayName = "not-unique"

	room, err := roomService.CreateRoom()
	assert.NoError(t, err)
	assert.NotNil(t, room)

	_, err = roomService.JoinRoom(room.Code, user)
	assert.NoError(t, err)

	_, err = roomService.JoinRoom(room.Code, user2)
	assert.Error(t, err)
	assert.Equal(t, ErrorDisplayNameInUse, err)
}

func TestRoomService_LeaveRoom(t *testing.T) {
	roomService := SetupRoomService()

	room, err := roomService.CreateRoom()
	assert.NoError(t, err)
	assert.NotNil(t, room)

	user := types.CreateUser("Linux")

	room2, err := roomService.JoinRoom(room.Code, user)
	assert.NoError(t, err)
	assert.NotNil(t, room2)
	assert.Equal(t, 1, len(room2.Users))

	room3, err := roomService.LeaveRoom(room.Code, user)
	assert.NoError(t, err)
	assert.NotNil(t, room3)
	assert.Equal(t, 0, len(room3.Users))
}

func TestRoomService_LeaveRoom_ThrowsRoomNotFoundError(t *testing.T) {
	roomService := SetupRoomService()

	user := types.CreateUser("Android")

	_, err := roomService.LeaveRoom("non-existing", user)
	assert.Error(t, err)
	assert.Equal(t, ErrorRoomNotFound, err)
}
