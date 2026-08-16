package workspace

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

// RecentWorkspace is one entry in the app-level "recently opened" list —
// VSCode-style quick reopen, so the native folder dialog isn't a required
// step every single launch.
//
// This is deliberately not workspace data: a list of recently opened
// workspace ROOTS necessarily spans more than one workspace, so it can't
// live inside any single workspace's tree (and it isn't per-workspace
// per-machine state either, the way .garnet.local.yaml is — see
// ADR 0005 — since it isn't scoped to one workspace at all). It's stored
// once per machine, in the OS's per-user config directory, entirely outside
// every workspace.
type RecentWorkspace struct {
	Path       string    `json:"path"`
	LastOpened time.Time `json:"lastOpened"`
}

// maxRecentWorkspaces caps the list — this is a quick-pick shortlist, not a
// full history.
const maxRecentWorkspaces = 10

// recentWorkspacesPathOverride lets tests point this at a temp file instead
// of the real per-user config directory, so a test run never touches
// whatever recent-workspaces list is sitting on the machine actually running
// it.
var recentWorkspacesPathOverride string

// recentWorkspacesPath returns where the list is stored:
// <UserConfigDir>/garnet/recent-workspaces.json.
func recentWorkspacesPath() (string, error) {
	if recentWorkspacesPathOverride != "" {
		return recentWorkspacesPathOverride, nil
	}
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "garnet", "recent-workspaces.json"), nil
}

func loadRecentWorkspaceList() ([]RecentWorkspace, error) {
	path, err := recentWorkspacesPath()
	if err != nil {
		return nil, err
	}
	raw, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []RecentWorkspace{}, nil
	}
	if err != nil {
		return nil, err
	}
	var list []RecentWorkspace
	if err := json.Unmarshal(raw, &list); err != nil {
		return nil, err
	}
	return list, nil
}

func saveRecentWorkspaceList(list []RecentWorkspace) error {
	path, err := recentWorkspacesPath()
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

// RecentWorkspaces returns recently opened workspace roots, most recent
// first. Entries whose directory no longer exists are silently dropped —
// stale paths aren't worth showing or erroring over, since this is a
// convenience list, not a record of anything.
func RecentWorkspaces() ([]RecentWorkspace, error) {
	list, err := loadRecentWorkspaceList()
	if err != nil {
		return nil, err
	}
	kept := make([]RecentWorkspace, 0, len(list))
	for _, r := range list {
		if dirExists(r.Path) {
			kept = append(kept, r)
		}
	}
	return kept, nil
}

// RecordRecentWorkspace records path as just-opened, moving it to the front
// if already present, and caps the list at maxRecentWorkspaces.
//
// Call this only from a real user-initiated open (the "Open Workspace"
// button, or picking a recent entry) — never from a background re-read
// after a mutation, or every reload would also bump the recent-workspaces
// order, which isn't what "recent" means here. workspace.Open itself stays
// unaware of this list for exactly that reason: it's called for both kinds
// of read, and can't tell which one a given call is.
func RecordRecentWorkspace(path string) error {
	list, err := loadRecentWorkspaceList()
	if err != nil {
		return err
	}

	filtered := make([]RecentWorkspace, 0, len(list)+1)
	filtered = append(filtered, RecentWorkspace{Path: path, LastOpened: time.Now().UTC()})
	for _, r := range list {
		if r.Path != path {
			filtered = append(filtered, r)
		}
	}
	if len(filtered) > maxRecentWorkspaces {
		filtered = filtered[:maxRecentWorkspaces]
	}
	return saveRecentWorkspaceList(filtered)
}
