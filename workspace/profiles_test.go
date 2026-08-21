package workspace

import (
	"errors"
	"path/filepath"
	"testing"
)

// useTempProfiles points the profile list at a fresh temp file for the
// duration of the test, mirroring useTempRecentWorkspaces.
func useTempProfiles(t *testing.T) {
	t.Helper()
	prev := profilesPathOverride
	profilesPathOverride = filepath.Join(t.TempDir(), "profiles.json")
	t.Cleanup(func() { profilesPathOverride = prev })
}

func TestListProfiles_EmptyByDefault(t *testing.T) {
	useTempProfiles(t)

	list, err := ListProfiles()
	if err != nil {
		t.Fatalf("ListProfiles() returned error: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("expected an empty list, got %+v", list)
	}
}

func TestAddProfile(t *testing.T) {
	useTempProfiles(t)

	p, err := AddProfile("Ada", "ada@example.com")
	if err != nil {
		t.Fatalf("AddProfile() returned error: %v", err)
	}
	if p.Name != "Ada" || p.Email != "ada@example.com" {
		t.Errorf("unexpected profile: %+v", p)
	}

	list, err := ListProfiles()
	if err != nil {
		t.Fatalf("ListProfiles() returned error: %v", err)
	}
	if len(list) != 1 || list[0].Email != "ada@example.com" {
		t.Errorf("expected the new profile listed, got %+v", list)
	}
}

func TestAddProfile_RejectsDuplicateEmail(t *testing.T) {
	useTempProfiles(t)

	if _, err := AddProfile("Ada", "ada@example.com"); err != nil {
		t.Fatalf("AddProfile() returned error: %v", err)
	}
	if _, err := AddProfile("Ada Lovelace", "ada@example.com"); err == nil {
		t.Fatal("expected an error adding a second profile for the same email, got nil")
	}
}

func TestAddProfile_RequiresNameAndEmail(t *testing.T) {
	useTempProfiles(t)

	if _, err := AddProfile("", "ada@example.com"); err == nil {
		t.Error("expected an error for a blank name, got nil")
	}
	if _, err := AddProfile("Ada", ""); err == nil {
		t.Error("expected an error for a blank email, got nil")
	}
}

func TestRemoveProfile(t *testing.T) {
	useTempProfiles(t)

	if _, err := AddProfile("Ada", "ada@example.com"); err != nil {
		t.Fatalf("AddProfile() returned error: %v", err)
	}
	if err := RemoveProfile("ada@example.com"); err != nil {
		t.Fatalf("RemoveProfile() returned error: %v", err)
	}

	list, err := ListProfiles()
	if err != nil {
		t.Fatalf("ListProfiles() returned error: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("expected the profile gone, got %+v", list)
	}
}

func TestRemoveProfile_NotFound(t *testing.T) {
	useTempProfiles(t)

	err := RemoveProfile("nobody@example.com")
	if err == nil {
		t.Fatal("expected an error removing a profile that doesn't exist, got nil")
	}
	var coded *CodedError
	if !errors.As(err, &coded) || coded.Code != CodeProfileNotFound {
		t.Errorf("expected code %q, got %v", CodeProfileNotFound, err)
	}
}

// TestProfilesPath_EnvOverride locks in the mechanism a test runner relies
// on to keep from ever touching a developer's real profile list — see
// profilesPath.
func TestProfilesPath_EnvOverride(t *testing.T) {
	prevOverride := profilesPathOverride
	profilesPathOverride = ""
	t.Cleanup(func() { profilesPathOverride = prevOverride })

	want := filepath.Join(t.TempDir(), "env-profiles.json")
	t.Setenv("GARNET_PROFILES_PATH", want)

	got, err := profilesPath()
	if err != nil {
		t.Fatalf("profilesPath() returned error: %v", err)
	}
	if got != want {
		t.Errorf("profilesPath() = %q, want %q", got, want)
	}
}
