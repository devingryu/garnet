package workspace

import (
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Identity is "who am I right now, in this workspace" — see ADR 0005 and
// GARNET-6. It's resolved from the workspace's active profile against the
// app-level profile list (profiles.go); it's never stored in this shape
// itself.
type Identity struct {
	Name  string `yaml:"name" json:"name"`
	Email string `yaml:"email" json:"email"`
}

const identityFileName = ".garnet.local.yaml"
const gitignoreEntry = ".garnet.local.yaml"

// identityFile mirrors .garnet.local.yaml. Legacy is the pre-GARNET-6 shape
// ({user: {name, email}}) — kept so a workspace written before profiles
// existed migrates in place on next load instead of breaking.
type identityFile struct {
	ActiveProfile string          `yaml:"activeProfile,omitempty"`
	Legacy        *legacyIdentity `yaml:"user,omitempty"`
}

type legacyIdentity struct {
	Name  string `yaml:"name"`
	Email string `yaml:"email"`
}

func readIdentityFile(root string) (identityFile, error) {
	raw, err := os.ReadFile(filepath.Join(root, identityFileName))
	if os.IsNotExist(err) {
		return identityFile{}, nil
	}
	if err != nil {
		return identityFile{}, err
	}
	var f identityFile
	if err := yaml.Unmarshal(raw, &f); err != nil {
		return identityFile{}, err
	}
	return f, nil
}

func writeActiveProfile(root, email string) error {
	data, err := yaml.Marshal(identityFile{ActiveProfile: email})
	if err != nil {
		return err
	}
	if err := writeFile(filepath.Join(root, identityFileName), data); err != nil {
		return err
	}
	return ensureGitignored(root, gitignoreEntry)
}

// LoadIdentity resolves "who am I" for this workspace: read
// .garnet.local.yaml's ActiveProfile, look it up in the app-level profile
// list, and return that. A missing file, an ActiveProfile that no longer
// matches any profile (e.g. it was removed), or no ActiveProfile at all all
// resolve to (nil, nil) — "no identity configured" is a valid state, not an
// error (Scenario 3 in requirements.md).
//
// A pre-GARNET-6 workspace still carrying the legacy {user: {name, email}}
// shape migrates transparently: that profile is added to the app-level list
// if it isn't there yet (matched by email), and the file is rewritten to
// activeProfile — a one-time change, invisible to every caller of
// LoadIdentity.
func LoadIdentity(root string) (*Identity, error) {
	f, err := readIdentityFile(root)
	if err != nil {
		return nil, err
	}

	if f.ActiveProfile == "" && f.Legacy != nil {
		if err := migrateLegacyIdentity(root, *f.Legacy); err != nil {
			return nil, err
		}
		return &Identity{Name: f.Legacy.Name, Email: f.Legacy.Email}, nil
	}

	if f.ActiveProfile == "" {
		return nil, nil
	}

	profiles, err := loadProfileList()
	if err != nil {
		return nil, err
	}
	for _, p := range profiles {
		if p.Email == f.ActiveProfile {
			return &Identity{Name: p.Name, Email: p.Email}, nil
		}
	}
	return nil, nil
}

func migrateLegacyIdentity(root string, legacy legacyIdentity) error {
	profiles, err := loadProfileList()
	if err != nil {
		return err
	}
	exists := false
	for _, p := range profiles {
		if p.Email == legacy.Email {
			exists = true
			break
		}
	}
	if !exists {
		if err := saveProfileList(append(profiles, Profile{Name: legacy.Name, Email: legacy.Email})); err != nil {
			return err
		}
	}
	return writeActiveProfile(root, legacy.Email)
}

// SaveIdentity is the one-shot path identity-setup-dialog.tsx uses: add (or
// reuse, if the email is already a saved profile) a profile for id, then
// make it this workspace's active one. Kept as a single call so the
// existing "type a name and email" first-run flow doesn't need to know
// profiles exist at all.
func SaveIdentity(root string, id Identity) error {
	profiles, err := loadProfileList()
	if err != nil {
		return err
	}
	found := false
	for _, p := range profiles {
		if p.Email == id.Email {
			found = true
			break
		}
	}
	if !found {
		if _, err := AddProfile(id.Name, id.Email); err != nil {
			return err
		}
	}
	return writeActiveProfile(root, id.Email)
}

// SetActiveProfile switches which saved profile this workspace attributes
// new activity to. email must already be a saved profile.
func SetActiveProfile(root, email string) error {
	profiles, err := loadProfileList()
	if err != nil {
		return err
	}
	found := false
	for _, p := range profiles {
		if p.Email == email {
			found = true
			break
		}
	}
	if !found {
		return errProfileNotFound(email)
	}
	return writeActiveProfile(root, email)
}

// ensureGitignored appends entry to the workspace's .gitignore if it isn't
// already covered, creating the file if it doesn't exist.
func ensureGitignored(root, entry string) error {
	path := filepath.Join(root, ".gitignore")
	raw, err := os.ReadFile(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	for _, line := range strings.Split(string(raw), "\n") {
		if strings.TrimSpace(line) == entry {
			return nil // already covered
		}
	}

	content := string(raw)
	if len(content) > 0 && !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	content += entry + "\n"

	return writeFile(path, []byte(content))
}
