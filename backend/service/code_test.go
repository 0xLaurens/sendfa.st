package service

import (
	"github.com/0xlaurens/filefa.st/store"
	"github.com/stretchr/testify/assert"
	"testing"
)

func SetupCodeService() CodeManagement {
	codeStore := store.NewCodeStoreInMemory()
	return NewCodeService(codeStore)
}

func TestCodeService_CodeExists(t *testing.T) {
	codeService := SetupCodeService()

	exists := codeService.CodeExists("AAAAA")
	assert.Equal(t, false, exists)

	code, err := codeService.GenerateCode()
	if err != nil {
		return
	}
	exists = codeService.CodeExists(code)
	assert.Equal(t, true, exists)
}

func TestCodeService_DeleteCode(t *testing.T) {
	codeService := SetupCodeService()

	code, err := codeService.GenerateCode()
	assert.NoError(t, err)

	exists := codeService.CodeExists(code)
	assert.Equal(t, true, exists)

	err = codeService.DeleteCode(code)
	assert.NoError(t, err)

	exists = codeService.CodeExists(code)
	assert.Equal(t, false, exists)
}

func TestCodeService_GenerateCode(t *testing.T) {
	codeService := SetupCodeService()

	code, err := codeService.GenerateCode()
	assert.NoError(t, err)
	assert.NotEmpty(t, code)

	// assert the format of the code
	assert.Equal(t, 5, len(code))
	for _, c := range code {
		assert.Contains(t, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", string(c))
	}
}
