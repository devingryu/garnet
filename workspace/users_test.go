package workspace

import (
	"errors"
	"testing"
)

func TestLoadUsers_EmptyWhenNoRegistry(t *testing.T) {
	root := t.TempDir()

	users, err := LoadUsers(root)
	if err != nil {
		t.Fatalf("LoadUsers() returned error: %v", err)
	}
	if len(users) != 0 {
		t.Errorf("expected an empty list, got %+v", users)
	}
}

func TestAddUser(t *testing.T) {
	root := t.TempDir()

	u, err := AddUser(root, "ada@example.com", "Ada")
	if err != nil {
		t.Fatalf("AddUser() returned error: %v", err)
	}
	if u.Email != "ada@example.com" || u.Name != "Ada" {
		t.Errorf("unexpected user: %+v", u)
	}

	users, err := LoadUsers(root)
	if err != nil {
		t.Fatalf("LoadUsers() returned error: %v", err)
	}
	if len(users) != 1 || users[0].Email != "ada@example.com" {
		t.Errorf("expected the new user listed, got %+v", users)
	}
}

func TestAddUser_RejectsDuplicateEmail(t *testing.T) {
	root := t.TempDir()

	if _, err := AddUser(root, "ada@example.com", "Ada"); err != nil {
		t.Fatalf("AddUser() returned error: %v", err)
	}
	if _, err := AddUser(root, "ada@example.com", "Ada Lovelace"); err == nil {
		t.Fatal("expected an error adding a second user for the same email, got nil")
	}
}

func TestAddUser_RequiresEmailAndName(t *testing.T) {
	root := t.TempDir()

	if _, err := AddUser(root, "", "Ada"); err == nil {
		t.Error("expected an error for a blank email, got nil")
	}
	if _, err := AddUser(root, "ada@example.com", ""); err == nil {
		t.Error("expected an error for a blank name, got nil")
	}
}

func TestRemoveUser(t *testing.T) {
	root := t.TempDir()

	if _, err := AddUser(root, "ada@example.com", "Ada"); err != nil {
		t.Fatalf("AddUser() returned error: %v", err)
	}
	if err := RemoveUser(root, "ada@example.com"); err != nil {
		t.Fatalf("RemoveUser() returned error: %v", err)
	}

	users, err := LoadUsers(root)
	if err != nil {
		t.Fatalf("LoadUsers() returned error: %v", err)
	}
	if len(users) != 0 {
		t.Errorf("expected the user gone, got %+v", users)
	}
}

func TestRemoveUser_NotFound(t *testing.T) {
	root := t.TempDir()

	err := RemoveUser(root, "nobody@example.com")
	if err == nil {
		t.Fatal("expected an error removing a user that doesn't exist, got nil")
	}
	var coded *CodedError
	if !errors.As(err, &coded) || coded.Code != CodeUserNotFound {
		t.Errorf("expected code %q, got %v", CodeUserNotFound, err)
	}
}

func TestSetUserLinks(t *testing.T) {
	root := t.TempDir()

	if _, err := AddUser(root, "ada@example.com", "Ada"); err != nil {
		t.Fatalf("AddUser() returned error: %v", err)
	}

	u, err := SetUserLinks(root, "ada@example.com", "adalovelace", "ada")
	if err != nil {
		t.Fatalf("SetUserLinks() returned error: %v", err)
	}
	if u.GitHub != "adalovelace" || u.Atlassian != "ada" {
		t.Errorf("unexpected user: %+v", u)
	}

	users, err := LoadUsers(root)
	if err != nil {
		t.Fatalf("LoadUsers() returned error: %v", err)
	}
	if len(users) != 1 || users[0].GitHub != "adalovelace" {
		t.Errorf("expected links persisted, got %+v", users)
	}
}

func TestSetUserLinks_NotFound(t *testing.T) {
	root := t.TempDir()

	_, err := SetUserLinks(root, "nobody@example.com", "x", "y")
	if err == nil {
		t.Fatal("expected an error updating links for a user that doesn't exist, got nil")
	}
	var coded *CodedError
	if !errors.As(err, &coded) || coded.Code != CodeUserNotFound {
		t.Errorf("expected code %q, got %v", CodeUserNotFound, err)
	}
}
