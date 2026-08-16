package workspace

import (
	"path/filepath"
	"testing"
)

// useTempRecentWorkspaces points the recent-workspaces list at a fresh temp
// file for the duration of the test, so tests never read or write the real
// per-user config directory.
func useTempRecentWorkspaces(t *testing.T) {
	t.Helper()
	prev := recentWorkspacesPathOverride
	recentWorkspacesPathOverride = filepath.Join(t.TempDir(), "recent-workspaces.json")
	t.Cleanup(func() { recentWorkspacesPathOverride = prev })
}

func TestRecentWorkspaces_EmptyByDefault(t *testing.T) {
	useTempRecentWorkspaces(t)

	list, err := RecentWorkspaces()
	if err != nil {
		t.Fatalf("RecentWorkspaces() returned error: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("expected an empty list, got %+v", list)
	}
}

func TestRecordRecentWorkspace_MostRecentFirst(t *testing.T) {
	useTempRecentWorkspaces(t)

	a := t.TempDir()
	b := t.TempDir()

	if err := RecordRecentWorkspace(a); err != nil {
		t.Fatalf("RecordRecentWorkspace(a) returned error: %v", err)
	}
	if err := RecordRecentWorkspace(b); err != nil {
		t.Fatalf("RecordRecentWorkspace(b) returned error: %v", err)
	}

	list, err := RecentWorkspaces()
	if err != nil {
		t.Fatalf("RecentWorkspaces() returned error: %v", err)
	}
	if len(list) != 2 || list[0].Path != b || list[1].Path != a {
		t.Fatalf("expected [b, a], got %+v", list)
	}
}

func TestRecordRecentWorkspace_ReopeningMovesToFront(t *testing.T) {
	useTempRecentWorkspaces(t)

	a := t.TempDir()
	b := t.TempDir()

	if err := RecordRecentWorkspace(a); err != nil {
		t.Fatalf("RecordRecentWorkspace(a) returned error: %v", err)
	}
	if err := RecordRecentWorkspace(b); err != nil {
		t.Fatalf("RecordRecentWorkspace(b) returned error: %v", err)
	}
	if err := RecordRecentWorkspace(a); err != nil {
		t.Fatalf("RecordRecentWorkspace(a) (again) returned error: %v", err)
	}

	list, err := RecentWorkspaces()
	if err != nil {
		t.Fatalf("RecentWorkspaces() returned error: %v", err)
	}
	if len(list) != 2 || list[0].Path != a || list[1].Path != b {
		t.Fatalf("expected reopening a to move it to the front [a, b], got %+v", list)
	}
}

func TestRecentWorkspaces_DropsDeletedDirectories(t *testing.T) {
	useTempRecentWorkspaces(t)

	gone := filepath.Join(t.TempDir(), "no-longer-here")
	if err := RecordRecentWorkspace(gone); err != nil {
		t.Fatalf("RecordRecentWorkspace() returned error: %v", err)
	}

	list, err := RecentWorkspaces()
	if err != nil {
		t.Fatalf("RecentWorkspaces() returned error: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("expected a directory that no longer exists to be dropped, got %+v", list)
	}
}

func TestRecentWorkspaces_CappedAtMax(t *testing.T) {
	useTempRecentWorkspaces(t)

	var paths []string
	for i := 0; i < maxRecentWorkspaces+5; i++ {
		paths = append(paths, t.TempDir())
	}
	for _, p := range paths {
		if err := RecordRecentWorkspace(p); err != nil {
			t.Fatalf("RecordRecentWorkspace(%q) returned error: %v", p, err)
		}
	}

	list, err := RecentWorkspaces()
	if err != nil {
		t.Fatalf("RecentWorkspaces() returned error: %v", err)
	}
	if len(list) != maxRecentWorkspaces {
		t.Fatalf("expected the list capped at %d, got %d", maxRecentWorkspaces, len(list))
	}
	// Most recently recorded should still be first.
	if list[0].Path != paths[len(paths)-1] {
		t.Errorf("expected the most recently recorded path first, got %+v", list[0])
	}
}
