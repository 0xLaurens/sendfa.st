package store

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func SetupCodeStore() CodeStore {
	return NewCodeStoreInMem()
}

func TestCodeStoreInMem_CreateCode(t *testing.T) {
	repo := SetupCodeStore()
	code := "test"
	err := repo.CreateCode(code)
	assert.NoError(t, err)
	res, err := repo.GetCode(code)
	assert.NoError(t, err)
	assert.Equal(t, code, res)
}

func TestCodeStoreInMem_DeleteCode(t *testing.T) {
	repo := SetupCodeStore()
	code := "test"
	err := repo.CreateCode(code)
	assert.NoError(t, err)
	err = repo.DeleteCode(code)
	assert.NoError(t, err)
	_, err = repo.GetCode(code)
	assert.Error(t, err)
}

func TestCodeStoreInMem_GetCodeNoCodeShouldThrowError(t *testing.T) {
	repo := SetupCodeStore()
	code := "test"
	_, err := repo.GetCode(code)
	assert.Error(t, err)
	assert.Equal(t, "code not found", err.Error())
}
