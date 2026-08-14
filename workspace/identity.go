package workspace

import (
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Identity is "who am I on this machine" — see ADR 0005. It is per-machine,
// not workspace data, and lives in an untracked .garnet.local.yaml.
type Identity struct {
	Name  string `yaml:"name" json:"name"`
	Email string `yaml:"email" json:"email"`
}

type identityFile struct {
	User Identity `yaml:"user"`
}

const identityFileName = ".garnet.local.yaml"
const gitignoreEntry = ".garnet.local.yaml"

// LoadIdentity reads .garnet.local.yaml from the workspace root. A missing
// file returns (nil, nil) — "no identity configured" is a valid state, not
// an error (see Scenario 3 in the requirements doc).
func LoadIdentity(root string) (*Identity, error) {
	raw, err := os.ReadFile(filepath.Join(root, identityFileName))
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var f identityFile
	if err := yaml.Unmarshal(raw, &f); err != nil {
		return nil, err
	}
	return &f.User, nil
}

// SaveIdentity writes .garnet.local.yaml and ensures the workspace's
// .gitignore excludes it, so it's never accidentally committed.
func SaveIdentity(root string, id Identity) error {
	data, err := yaml.Marshal(identityFile{User: id})
	if err != nil {
		return err
	}
	if err := writeFile(filepath.Join(root, identityFileName), data); err != nil {
		return err
	}
	return ensureGitignored(root, gitignoreEntry)
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
