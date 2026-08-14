package workspace

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// newLocalGitRepo creates a tiny local git repo with one commit, so clone
// tests have no network dependency. Returns a file:// URL git will accept.
func newLocalGitRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	run := func(args ...string) {
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		cmd.Env = append(os.Environ(),
			"GIT_AUTHOR_NAME=test", "GIT_AUTHOR_EMAIL=test@example.com",
			"GIT_COMMITTER_NAME=test", "GIT_COMMITTER_EMAIL=test@example.com",
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v: %s", args, err, out)
		}
	}

	run("init", "-q", "-b", "main")
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte("hello\n"), 0o644); err != nil {
		t.Fatalf("writing README: %v", err)
	}
	run("add", "README.md")
	run("commit", "-q", "-m", "initial commit")

	return dir
}

func TestCloneProjectRepos(t *testing.T) {
	srcRepo := newLocalGitRepo(t)
	root := copyFixture(t, "valid")

	if _, err := RemoveProjectRepo(root, "GRNT", "garnet"); err != nil {
		t.Fatalf("RemoveProjectRepo() returned error: %v", err)
	}
	if _, err := AddProjectRepo(root, "GRNT", srcRepo, "example"); err != nil {
		t.Fatalf("AddProjectRepo() returned error: %v", err)
	}

	result, err := CloneProjectRepos(root, "GRNT")
	if err != nil {
		t.Fatalf("CloneProjectRepos() returned error: %v", err)
	}
	if len(result.Warnings) != 0 {
		t.Errorf("expected no warnings, got %+v", result.Warnings)
	}
	if len(result.Cloned) != 1 || result.Cloned[0] != "example" {
		t.Errorf("expected [example] cloned, got %+v", result.Cloned)
	}

	readme, err := os.ReadFile(filepath.Join(root, "repos", "example", "README.md"))
	if err != nil {
		t.Fatalf("expected cloned README.md: %v", err)
	}
	if !strings.Contains(string(readme), "hello") {
		t.Errorf("unexpected README content: %q", readme)
	}

	gitignore, err := os.ReadFile(filepath.Join(root, ".gitignore"))
	if err != nil {
		t.Fatalf("expected .gitignore to exist: %v", err)
	}
	if !strings.Contains(string(gitignore), "repos/") {
		t.Errorf(".gitignore does not cover repos/: %q", gitignore)
	}
}

func TestCloneProjectRepos_SkipsAlreadyCloned(t *testing.T) {
	srcRepo := newLocalGitRepo(t)
	root := copyFixture(t, "valid")
	if _, err := RemoveProjectRepo(root, "GRNT", "garnet"); err != nil {
		t.Fatalf("RemoveProjectRepo() returned error: %v", err)
	}
	if _, err := AddProjectRepo(root, "GRNT", srcRepo, "example"); err != nil {
		t.Fatalf("AddProjectRepo() returned error: %v", err)
	}

	if _, err := CloneProjectRepos(root, "GRNT"); err != nil {
		t.Fatalf("CloneProjectRepos() #1 returned error: %v", err)
	}
	// Remove the source so a second clone attempt would fail if it were
	// actually re-attempted — proves the "already present" skip works.
	if err := os.RemoveAll(srcRepo); err != nil {
		t.Fatalf("removing source repo: %v", err)
	}

	result, err := CloneProjectRepos(root, "GRNT")
	if err != nil {
		t.Fatalf("CloneProjectRepos() #2 returned error: %v", err)
	}
	if len(result.Warnings) != 0 {
		t.Errorf("expected no warnings on the second call, got %+v", result.Warnings)
	}
	if len(result.Cloned) != 1 || result.Cloned[0] != "example" {
		t.Errorf("expected [example] still reported as cloned, got %+v", result.Cloned)
	}
}

func TestCloneProjectRepos_BadURLIsAWarningNotAFailure(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := RemoveProjectRepo(root, "GRNT", "garnet"); err != nil {
		t.Fatalf("RemoveProjectRepo() returned error: %v", err)
	}
	if _, err := AddProjectRepo(root, "GRNT", "/nonexistent/path/to/nowhere", "broken"); err != nil {
		t.Fatalf("AddProjectRepo() returned error: %v", err)
	}

	result, err := CloneProjectRepos(root, "GRNT")
	if err != nil {
		t.Fatalf("expected a nil error (bad clones are warnings), got %v", err)
	}
	if len(result.Warnings) != 1 {
		t.Fatalf("expected 1 warning, got %+v", result.Warnings)
	}
	if len(result.Cloned) != 0 {
		t.Errorf("expected nothing cloned, got %+v", result.Cloned)
	}
}
