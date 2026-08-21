package workspace

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

// Profile is one of the user's own name+email identities (GARNET-6,
// resolving ADR 0005's deferred "profiles vs. .garnet.local.yaml"
// question). Kept at the app level, not per-workspace — the same list of
// "who could I be" shows up no matter which workspace is open. A workspace
// only records which one is active right now (see identity.go's
// ActiveProfile).
//
// This is deliberately not workspace data, the same reasoning as
// RecentWorkspace in recent.go: a person's own profiles aren't scoped to
// one workspace's tree, and they aren't per-workspace-per-machine state
// either (unlike which profile is active, which is — different workspaces
// can reasonably want different active profiles, work vs. personal). Held
// once per machine, in the OS's per-user config directory.
type Profile struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

// profilesPathOverride lets tests point this at a temp file instead of the
// real per-user config directory, mirroring recentWorkspacesPathOverride.
var profilesPathOverride string

// profilesPath returns where the profile list is stored:
// <UserConfigDir>/garnet/profiles.json — unless $GARNET_PROFILES_PATH is
// set (same override mechanism as recent.go, for the same reason: a test
// run must never touch whatever profile list is sitting on the machine
// actually running it).
func profilesPath() (string, error) {
	if profilesPathOverride != "" {
		return profilesPathOverride, nil
	}
	if envPath := os.Getenv("GARNET_PROFILES_PATH"); envPath != "" {
		return envPath, nil
	}
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "garnet", "profiles.json"), nil
}

func loadProfileList() ([]Profile, error) {
	path, err := profilesPath()
	if err != nil {
		return nil, err
	}
	raw, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []Profile{}, nil
	}
	if err != nil {
		return nil, err
	}
	var list []Profile
	if err := json.Unmarshal(raw, &list); err != nil {
		return nil, err
	}
	return list, nil
}

func saveProfileList(list []Profile) error {
	path, err := profilesPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	return writeFile(path, data)
}

// ListProfiles returns the user's saved profiles.
func ListProfiles() ([]Profile, error) {
	return loadProfileList()
}

// AddProfile appends a new profile. Email is the key (ADR 0005): adding one
// that already exists is an error rather than a silent overwrite, since a
// name change for an existing email should go through a rename, not a
// second add.
func AddProfile(name, email string) (*Profile, error) {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)
	if name == "" {
		return nil, errProfileNameRequired()
	}
	if email == "" {
		return nil, errProfileEmailRequired()
	}

	list, err := loadProfileList()
	if err != nil {
		return nil, err
	}
	for _, p := range list {
		if p.Email == email {
			return nil, errProfileAlreadyExists(email)
		}
	}

	profile := Profile{Name: name, Email: email}
	list = append(list, profile)
	if err := saveProfileList(list); err != nil {
		return nil, err
	}
	return &profile, nil
}

// RemoveProfile deletes a profile by email. Any workspace whose
// ActiveProfile still names this email simply stops resolving to an
// identity on next load — the same tolerance LoadIdentity already has for
// "no identity configured" (Scenario 3), not a new failure mode.
func RemoveProfile(email string) error {
	list, err := loadProfileList()
	if err != nil {
		return err
	}
	kept := make([]Profile, 0, len(list))
	found := false
	for _, p := range list {
		if p.Email == email {
			found = true
			continue
		}
		kept = append(kept, p)
	}
	if !found {
		return errProfileNotFound(email)
	}
	return saveProfileList(kept)
}
