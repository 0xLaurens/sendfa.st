package service

import (
	"github.com/0xlaurens/filefa.st/store"
	"math/rand"
)

type CodeManagement interface {
	GenerateCode() (string, error)
	CodeExists(code string) bool
	DeleteCode(code string) error
}

const (
	Letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
)

type CodeService struct {
	store store.CodeStore
}

var _ CodeManagement = (*CodeService)(nil)

func NewCodeService(store store.CodeStore) *CodeService {
	return &CodeService{store}
}

func (c *CodeService) CodeExists(code string) bool {
	_, err := c.store.GetCode(code)
	return err == nil
}

func (c *CodeService) DeleteCode(code string) error {
	return c.store.DeleteCode(code)
}

func generateCode() string {
	bytes := make([]byte, 5)
	for i := 0; i < 5; i++ {
		bytes[i] = Letters[rand.Intn(len(Letters))]
	}
	return string(bytes)
}

func (c *CodeService) GenerateCode() (string, error) {
	code := generateCode()
	for c.CodeExists(code) {
		code = generateCode()
	}

	err := c.store.CreateCode(code)
	if err != nil {
		return "", err
	}

	return code, nil
}
