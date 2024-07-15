package store

import (
	"errors"
	"sync"
)

type CodeStore interface {
	CreateCode(code string) error
	GetCode(code string) (string, error)
	DeleteCode(code string) error
}

type CodeStoreInMem struct {
	mu    sync.RWMutex
	codes map[string]string
}

func NewCodeStoreInMem() *CodeStoreInMem {
	return &CodeStoreInMem{
		codes: make(map[string]string),
	}
}

func (s *CodeStoreInMem) CreateCode(code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.codes[code] = code
	return nil
}

func (s *CodeStoreInMem) GetCode(code string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.codes[code]
	if !ok {
		return "", errors.New("code not found")
	}
	return c, nil
}

func (s *CodeStoreInMem) DeleteCode(code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.codes, code)
	return nil
}
