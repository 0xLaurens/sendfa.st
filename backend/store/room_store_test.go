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
	room := types.CreateRoom()
	err := repo.CreateRoom(room)
	assert.NoError(t, err)

	roomFromMap, err := repo.GetRoomById(room.ID)
	assert.NoError(t, err)
	assert.Equal(t, room, roomFromMap)
}

func TestRoomShouldBeDeletedFromBothMaps(t *testing.T) {
	repo := SetupRoomStore()
	room := types.CreateRoom()
	err := repo.CreateRoom(room)
	assert.NoError(t, err)

	err = repo.DeleteRoom(room.ID)
	assert.NoError(t, err)

	roomFromMap, err := repo.GetRoomById(room.ID)
	assert.Error(t, err)
	assert.Nil(t, roomFromMap)
}

func TestRoomShouldBeUpdatedInBothMaps(t *testing.T) {
	repo := SetupRoomStore()
	room := types.CreateRoom()
	err := repo.CreateRoom(room)
	assert.NoError(t, err)

	err = repo.CreateRoom(room)
	assert.NoError(t, err)

	roomFromMap, err := repo.GetRoomById(room.ID)
	assert.NoError(t, err)
	assert.Equal(t, room, roomFromMap)
}
