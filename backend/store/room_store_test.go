package store

import (
	"github.com/0xlaurens/filefa.st/types"
	"github.com/stretchr/testify/assert"
	"testing"
)

func SetupRoomStore() RoomStore {
	return NewRoomStoreInMemory()
}

func TestRoomShouldBeAddedToBothMaps(t *testing.T) {
	repo := SetupRoomStore()
	room := types.CreateRoom("test")
	err := repo.CreateRoom(room)
	assert.NoError(t, err)

	roomFromMap, err := repo.GetRoomById(room.ID)
	assert.NoError(t, err)
	assert.Equal(t, room, roomFromMap)

	roomFromCodeMap, err := repo.GetRoomByCode(room.Code)
	assert.NoError(t, err)
	assert.Equal(t, room, roomFromCodeMap)
}

func TestRoomShouldBeDeletedFromBothMaps(t *testing.T) {
	repo := SetupRoomStore()
	room := types.CreateRoom("test")
	err := repo.CreateRoom(room)
	assert.NoError(t, err)

	err = repo.DeleteRoom(room.ID)
	assert.NoError(t, err)

	roomFromMap, err := repo.GetRoomById(room.ID)
	assert.Error(t, err)
	assert.Nil(t, roomFromMap)

	roomFromCodeMap, err := repo.GetRoomByCode(room.Code)
	assert.Error(t, err)
	assert.Nil(t, roomFromCodeMap)
}

func TestRoomShouldBeUpdatedInBothMaps(t *testing.T) {
	repo := SetupRoomStore()
	room := types.CreateRoom("test")
	err := repo.CreateRoom(room)
	assert.NoError(t, err)

	room.Code = "updated"
	err = repo.CreateRoom(room)
	assert.NoError(t, err)

	roomFromMap, err := repo.GetRoomById(room.ID)
	assert.NoError(t, err)
	assert.Equal(t, room, roomFromMap)

	roomFromCodeMap, err := repo.GetRoomByCode(room.Code)
	assert.NoError(t, err)
	assert.Equal(t, room, roomFromCodeMap)
}
