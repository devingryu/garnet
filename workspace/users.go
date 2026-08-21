package workspace

import (
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// User is a workspace-wide, git-tracked record of who an email address
// belongs to — the registry ADR 0005 deferred ("Later. A users.yaml
// registry... is deferred, not rejected"), now built out by GARNET-16 now
// that GARNET-6 gives it somewhere to be edited from (UserSettingsDialog).
//
// Avatar is deliberately not a field: Gravatar is itself keyed on the
// email, so it's computed from Email wherever it's rendered, with no
// registry entry required.
type User struct {
	Email     string `yaml:"email" json:"email"`
	Name      string `yaml:"name" json:"name"`
	GitHub    string `yaml:"github,omitempty" json:"github"`
	Atlassian string `yaml:"atlassian,omitempty" json:"atlassian"`
}

// userRegistry is the shape of users.yaml on disk.
type userRegistry struct {
	Users []User `yaml:"users"`
}

const usersFileName = "users.yaml"

// loadUsers reads users.yaml from root. A missing file is not an error —
// unlike project members, nobody has to be registered before their email
// can appear as a reporter or assignee (ADR 0005).
func loadUsers(root string) ([]User, error) {
	raw, err := os.ReadFile(filepath.Join(root, usersFileName))
	if os.IsNotExist(err) {
		return []User{}, nil
	}
	if err != nil {
		return nil, err
	}

	var reg userRegistry
	if err := yaml.Unmarshal(raw, &reg); err != nil {
		return nil, err
	}
	if reg.Users == nil {
		reg.Users = []User{}
	}
	return reg.Users, nil
}

func saveUsers(root string, users []User) error {
	if users == nil {
		users = []User{}
	}
	data, err := yaml.Marshal(userRegistry{Users: users})
	if err != nil {
		return err
	}
	return writeFile(filepath.Join(root, usersFileName), data)
}

// LoadUsers returns the workspace's shared user registry.
func LoadUsers(root string) ([]User, error) {
	return loadUsers(root)
}

// AddUser registers a display name (and, optionally, external account
// links) against an email. email is the key, matching how reporter/
// assignee/timeline actors are already identified.
func AddUser(root, email, name string) (*User, error) {
	if strings.TrimSpace(email) == "" {
		return nil, errUserEmailRequired()
	}
	if strings.TrimSpace(name) == "" {
		return nil, errUserNameRequired()
	}

	users, err := loadUsers(root)
	if err != nil {
		return nil, err
	}
	for _, u := range users {
		if u.Email == email {
			return nil, errUserAlreadyExists(email)
		}
	}

	user := User{Email: email, Name: name}
	users = append(users, user)
	if err := saveUsers(root, users); err != nil {
		return nil, err
	}
	return &user, nil
}

// RemoveUser un-registers an email. Issues that already reference it are
// untouched — the email itself, not the registry entry, is what's stored
// on reporter/assignee/timeline fields.
func RemoveUser(root, email string) error {
	users, err := loadUsers(root)
	if err != nil {
		return err
	}

	found := false
	kept := make([]User, 0, len(users))
	for _, u := range users {
		if u.Email == email {
			found = true
			continue
		}
		kept = append(kept, u)
	}
	if !found {
		return errUserNotFound(email)
	}
	return saveUsers(root, kept)
}

// SetUserLinks replaces an existing user's external account links wholesale
// — the editor UI always resends both fields, so there's no partial update
// to reconcile (same reasoning as SetProjectIssueTypes).
func SetUserLinks(root, email, github, atlassian string) (*User, error) {
	users, err := loadUsers(root)
	if err != nil {
		return nil, err
	}

	for i, u := range users {
		if u.Email == email {
			users[i].GitHub = github
			users[i].Atlassian = atlassian
			if err := saveUsers(root, users); err != nil {
				return nil, err
			}
			return &users[i], nil
		}
	}
	return nil, errUserNotFound(email)
}
