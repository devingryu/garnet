package workspace

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadIdentity_NoFileConfigured(t *testing.T) {
	useTempProfiles(t)
	root := t.TempDir()

	id, err := LoadIdentity(root)
	if err != nil {
		t.Fatalf("LoadIdentity() returned error: %v", err)
	}
	if id != nil {
		t.Errorf("expected nil identity for a workspace with no .garnet.local.yaml, got %+v", id)
	}
}

func TestSaveIdentity_ThenLoadIdentity(t *testing.T) {
	useTempProfiles(t)
	root := t.TempDir()

	if err := SaveIdentity(root, Identity{Name: "Ada", Email: "ada@example.com"}); err != nil {
		t.Fatalf("SaveIdentity() returned error: %v", err)
	}

	id, err := LoadIdentity(root)
	if err != nil {
		t.Fatalf("LoadIdentity() returned error: %v", err)
	}
	if id == nil || id.Name != "Ada" || id.Email != "ada@example.com" {
		t.Fatalf("unexpected identity: %+v", id)
	}

	// SaveIdentity is the one-shot setup path — it must also register the
	// profile at the app level, not just point this workspace at it.
	profiles, err := ListProfiles()
	if err != nil {
		t.Fatalf("ListProfiles() returned error: %v", err)
	}
	if len(profiles) != 1 || profiles[0].Email != "ada@example.com" {
		t.Errorf("expected SaveIdentity to have registered a profile, got %+v", profiles)
	}

	raw, err := os.ReadFile(filepath.Join(root, identityFileName))
	if err != nil {
		t.Fatalf("reading .garnet.local.yaml: %v", err)
	}
	if !strings.Contains(string(raw), "activeProfile: ada@example.com") {
		t.Errorf("expected the new activeProfile shape on disk, got %q", raw)
	}
}

func TestSaveIdentity_GitignoresTheFile(t *testing.T) {
	useTempProfiles(t)
	root := t.TempDir()

	if err := SaveIdentity(root, Identity{Name: "Ada", Email: "ada@example.com"}); err != nil {
		t.Fatalf("SaveIdentity() returned error: %v", err)
	}

	raw, err := os.ReadFile(filepath.Join(root, ".gitignore"))
	if err != nil {
		t.Fatalf("reading .gitignore: %v", err)
	}
	if !strings.Contains(string(raw), ".garnet.local.yaml") {
		t.Errorf(".gitignore does not cover .garnet.local.yaml: %q", raw)
	}
}

func TestLoadIdentity_MigratesLegacyShape(t *testing.T) {
	useTempProfiles(t)
	root := t.TempDir()

	legacy := "user:\n  name: devingryu\n  email: devingryu@korea.ac.kr\n"
	if err := os.WriteFile(filepath.Join(root, identityFileName), []byte(legacy), 0o644); err != nil {
		t.Fatalf("writing legacy .garnet.local.yaml: %v", err)
	}

	id, err := LoadIdentity(root)
	if err != nil {
		t.Fatalf("LoadIdentity() returned error: %v", err)
	}
	if id == nil || id.Name != "devingryu" || id.Email != "devingryu@korea.ac.kr" {
		t.Fatalf("unexpected identity from legacy shape: %+v", id)
	}

	// The migration registers the profile at the app level...
	profiles, err := ListProfiles()
	if err != nil {
		t.Fatalf("ListProfiles() returned error: %v", err)
	}
	if len(profiles) != 1 || profiles[0].Email != "devingryu@korea.ac.kr" {
		t.Errorf("expected the legacy identity registered as a profile, got %+v", profiles)
	}

	// ...and rewrites the file, so migration only happens once.
	raw, err := os.ReadFile(filepath.Join(root, identityFileName))
	if err != nil {
		t.Fatalf("reading .garnet.local.yaml: %v", err)
	}
	if !strings.Contains(string(raw), "activeProfile: devingryu@korea.ac.kr") {
		t.Errorf("expected the file rewritten to the new shape, got %q", raw)
	}
}

func TestLoadIdentity_ActiveProfileRemoved(t *testing.T) {
	useTempProfiles(t)
	root := t.TempDir()

	if err := SaveIdentity(root, Identity{Name: "Ada", Email: "ada@example.com"}); err != nil {
		t.Fatalf("SaveIdentity() returned error: %v", err)
	}
	if err := RemoveProfile("ada@example.com"); err != nil {
		t.Fatalf("RemoveProfile() returned error: %v", err)
	}

	// The workspace's activeProfile now names a profile that no longer
	// exists — resolves to "no identity", not an error (same tolerance as
	// never having configured one).
	id, err := LoadIdentity(root)
	if err != nil {
		t.Fatalf("LoadIdentity() returned error: %v", err)
	}
	if id != nil {
		t.Errorf("expected nil identity once the active profile is removed, got %+v", id)
	}
}

func TestSetActiveProfile(t *testing.T) {
	useTempProfiles(t)
	root := t.TempDir()

	if _, err := AddProfile("Ada", "ada@example.com"); err != nil {
		t.Fatalf("AddProfile() returned error: %v", err)
	}
	if _, err := AddProfile("Ada (work)", "ada@work.example.com"); err != nil {
		t.Fatalf("AddProfile() returned error: %v", err)
	}
	if err := SetActiveProfile(root, "ada@example.com"); err != nil {
		t.Fatalf("SetActiveProfile() returned error: %v", err)
	}

	id, err := LoadIdentity(root)
	if err != nil {
		t.Fatalf("LoadIdentity() returned error: %v", err)
	}
	if id == nil || id.Email != "ada@example.com" {
		t.Fatalf("expected the active profile to be ada@example.com, got %+v", id)
	}

	if err := SetActiveProfile(root, "ada@work.example.com"); err != nil {
		t.Fatalf("SetActiveProfile() (switch) returned error: %v", err)
	}
	id, err = LoadIdentity(root)
	if err != nil {
		t.Fatalf("LoadIdentity() returned error: %v", err)
	}
	if id == nil || id.Email != "ada@work.example.com" {
		t.Fatalf("expected the active profile to have switched, got %+v", id)
	}
}

func TestSetActiveProfile_RequiresExistingProfile(t *testing.T) {
	useTempProfiles(t)
	root := t.TempDir()

	err := SetActiveProfile(root, "nobody@example.com")
	if err == nil {
		t.Fatal("expected an error activating a profile that doesn't exist, got nil")
	}
}

// TestLoadIdentity_TwoWorkspacesDifferentActiveProfiles is Scenario 3's
// "two workspaces on the same machine can hold different identities" —
// still true under profiles, since ActiveProfile is per-workspace even
// though the profile list itself is shared.
func TestLoadIdentity_TwoWorkspacesDifferentActiveProfiles(t *testing.T) {
	useTempProfiles(t)
	workA := t.TempDir()
	workB := t.TempDir()

	if _, err := AddProfile("Personal", "me@personal.example.com"); err != nil {
		t.Fatalf("AddProfile() returned error: %v", err)
	}
	if _, err := AddProfile("Work", "me@work.example.com"); err != nil {
		t.Fatalf("AddProfile() returned error: %v", err)
	}
	if err := SetActiveProfile(workA, "me@personal.example.com"); err != nil {
		t.Fatalf("SetActiveProfile(workA) returned error: %v", err)
	}
	if err := SetActiveProfile(workB, "me@work.example.com"); err != nil {
		t.Fatalf("SetActiveProfile(workB) returned error: %v", err)
	}

	idA, err := LoadIdentity(workA)
	if err != nil {
		t.Fatalf("LoadIdentity(workA) returned error: %v", err)
	}
	idB, err := LoadIdentity(workB)
	if err != nil {
		t.Fatalf("LoadIdentity(workB) returned error: %v", err)
	}
	if idA == nil || idA.Email != "me@personal.example.com" {
		t.Errorf("unexpected identity for workA: %+v", idA)
	}
	if idB == nil || idB.Email != "me@work.example.com" {
		t.Errorf("unexpected identity for workB: %+v", idB)
	}
}
