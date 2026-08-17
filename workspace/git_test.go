package workspace

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// runGitT runs git in dir for test setup, failing the test on error — the
// test-side equivalent of runGit, with no timeout/error-wrapping concerns
// since a broken setup command should just fail loudly.
func runGitT(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(),
		"GIT_AUTHOR_NAME=test", "GIT_AUTHOR_EMAIL=test@example.com",
		"GIT_COMMITTER_NAME=test", "GIT_COMMITTER_EMAIL=test@example.com",
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v: %s", args, err, out)
	}
	return string(out)
}

// initCommittedGitRepo turns dir (already populated by copyFixture) into a
// git repo with everything in it as one initial commit, so tests can make
// further edits and see them as the changes GetGitStatus reports.
func initCommittedGitRepo(t *testing.T, dir string) {
	t.Helper()
	runGitT(t, dir, "init", "-q", "-b", "main")
	runGitT(t, dir, "add", "-A")
	runGitT(t, dir, "commit", "-q", "-m", "initial commit")
}

func codeOf(t *testing.T, err error) string {
	t.Helper()
	var coded *CodedError
	if !errors.As(err, &coded) {
		t.Fatalf("expected a *CodedError, got %v (%T)", err, err)
	}
	return coded.Code
}

func TestGetGitStatus_NotAGitRepo(t *testing.T) {
	root := copyFixture(t, "valid") // never git-init'd

	_, err := GetGitStatus(root)
	if err == nil {
		t.Fatal("expected an error for a workspace that isn't a git repo")
	}
	if code := codeOf(t, err); code != CodeNotAGitRepo {
		t.Errorf("expected code %q, got %q", CodeNotAGitRepo, code)
	}
}

func TestGetGitStatus_ReportsStagedAndUnstagedChanges(t *testing.T) {
	root := copyFixture(t, "valid")
	initCommittedGitRepo(t, root)

	// Unstaged: a tracked file edited, plus a new untracked file.
	if err := os.WriteFile(filepath.Join(root, "issues", "GRNT-1", "issue.md"), []byte("edited\n"), 0o644); err != nil {
		t.Fatalf("editing issue.md: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "untracked.md"), []byte("new\n"), 0o644); err != nil {
		t.Fatalf("writing untracked.md: %v", err)
	}
	// Staged: a second tracked file edited and added.
	if err := os.WriteFile(filepath.Join(root, "decisions", "0001-test-decision.md"), []byte("staged edit\n"), 0o644); err != nil {
		t.Fatalf("editing decision: %v", err)
	}
	runGitT(t, root, "add", "decisions/0001-test-decision.md")

	status, err := GetGitStatus(root)
	if err != nil {
		t.Fatalf("GetGitStatus() returned error: %v", err)
	}

	if status.Branch != "main" {
		t.Errorf("expected branch 'main', got %q", status.Branch)
	}
	if status.HasUpstream {
		t.Error("expected no upstream configured")
	}

	unstagedPaths := changeMap(status.Unstaged)
	if unstagedPaths["issues/GRNT-1/issue.md"] != "modified" {
		t.Errorf("expected issue.md unstaged as modified, got %+v", status.Unstaged)
	}
	if unstagedPaths["untracked.md"] != "untracked" {
		t.Errorf("expected untracked.md reported as untracked, got %+v", status.Unstaged)
	}

	stagedPaths := changeMap(status.Staged)
	if stagedPaths["decisions/0001-test-decision.md"] != "modified" {
		t.Errorf("expected the decision doc staged as modified, got %+v", status.Staged)
	}
	if _, stillUnstaged := unstagedPaths["decisions/0001-test-decision.md"]; stillUnstaged {
		t.Error("expected the staged file to not also appear as unstaged")
	}
}

func changeMap(changes []GitFileChange) map[string]string {
	m := make(map[string]string, len(changes))
	for _, c := range changes {
		m[c.Path] = c.Status
	}
	return m
}

func TestStageAll_MovesEverythingToStaged(t *testing.T) {
	root := copyFixture(t, "valid")
	initCommittedGitRepo(t, root)

	if err := os.WriteFile(filepath.Join(root, "issues", "GRNT-1", "issue.md"), []byte("edited\n"), 0o644); err != nil {
		t.Fatalf("editing issue.md: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "untracked.md"), []byte("new\n"), 0o644); err != nil {
		t.Fatalf("writing untracked.md: %v", err)
	}

	if err := StageAll(root); err != nil {
		t.Fatalf("StageAll() returned error: %v", err)
	}

	status, err := GetGitStatus(root)
	if err != nil {
		t.Fatalf("GetGitStatus() returned error: %v", err)
	}
	if len(status.Unstaged) != 0 {
		t.Errorf("expected nothing left unstaged, got %+v", status.Unstaged)
	}
	staged := changeMap(status.Staged)
	if staged["issues/GRNT-1/issue.md"] != "modified" || staged["untracked.md"] != "added" {
		t.Errorf("unexpected staged set: %+v", status.Staged)
	}
}

func TestStagePaths_StagesOnlyGivenPaths(t *testing.T) {
	root := copyFixture(t, "valid")
	initCommittedGitRepo(t, root)

	if err := os.WriteFile(filepath.Join(root, "issues", "GRNT-1", "issue.md"), []byte("edited\n"), 0o644); err != nil {
		t.Fatalf("editing issue.md: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "untracked.md"), []byte("new\n"), 0o644); err != nil {
		t.Fatalf("writing untracked.md: %v", err)
	}

	if err := StagePaths(root, []string{"untracked.md"}); err != nil {
		t.Fatalf("StagePaths() returned error: %v", err)
	}

	status, err := GetGitStatus(root)
	if err != nil {
		t.Fatalf("GetGitStatus() returned error: %v", err)
	}
	staged := changeMap(status.Staged)
	unstaged := changeMap(status.Unstaged)
	if staged["untracked.md"] != "added" {
		t.Errorf("expected untracked.md staged, got %+v", status.Staged)
	}
	if unstaged["issues/GRNT-1/issue.md"] != "modified" {
		t.Errorf("expected issue.md to remain unstaged, got %+v", status.Unstaged)
	}
}

func TestCommitStaged_RequiresMessage(t *testing.T) {
	root := copyFixture(t, "valid")
	initCommittedGitRepo(t, root)

	err := CommitStaged(root, "   ")
	if err == nil {
		t.Fatal("expected an error for a blank commit message")
	}
	if code := codeOf(t, err); code != CodeCommitMessageRequired {
		t.Errorf("expected code %q, got %q", CodeCommitMessageRequired, code)
	}
}

func TestCommitStaged_RequiresIdentity(t *testing.T) {
	root := copyFixture(t, "valid")
	initCommittedGitRepo(t, root)
	if err := os.WriteFile(filepath.Join(root, "untracked.md"), []byte("new\n"), 0o644); err != nil {
		t.Fatalf("writing untracked.md: %v", err)
	}
	if err := StageAll(root); err != nil {
		t.Fatalf("StageAll() returned error: %v", err)
	}

	err := CommitStaged(root, "a commit")
	if err == nil {
		t.Fatal("expected an error committing with no identity configured")
	}
	if code := codeOf(t, err); code != CodeIdentityRequired {
		t.Errorf("expected code %q, got %q", CodeIdentityRequired, code)
	}
}

func TestCommitStaged_Success(t *testing.T) {
	root := copyFixture(t, "valid")
	initCommittedGitRepo(t, root)
	if err := SaveIdentity(root, Identity{Name: "Ada", Email: "ada@example.com"}); err != nil {
		t.Fatalf("SaveIdentity() returned error: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, "untracked.md"), []byte("new\n"), 0o644); err != nil {
		t.Fatalf("writing untracked.md: %v", err)
	}
	if err := StageAll(root); err != nil {
		t.Fatalf("StageAll() returned error: %v", err)
	}

	if err := CommitStaged(root, "add untracked.md"); err != nil {
		t.Fatalf("CommitStaged() returned error: %v", err)
	}

	status, err := GetGitStatus(root)
	if err != nil {
		t.Fatalf("GetGitStatus() returned error: %v", err)
	}
	if len(status.Staged) != 0 || len(status.Unstaged) != 0 {
		t.Errorf("expected a clean tree after commit, got staged=%+v unstaged=%+v", status.Staged, status.Unstaged)
	}

	log := runGitT(t, root, "log", "-1", "--format=%an <%ae> %s")
	if !strings.Contains(log, "Ada <ada@example.com> add untracked.md") {
		t.Errorf("expected commit authored by the configured identity, got %q", log)
	}
}

func TestPushRepo_NoUpstream(t *testing.T) {
	root := copyFixture(t, "valid")
	initCommittedGitRepo(t, root)

	err := PushRepo(root)
	if err == nil {
		t.Fatal("expected an error pushing with no upstream configured")
	}
	if code := codeOf(t, err); code != CodeGitNoUpstream {
		t.Errorf("expected code %q, got %q", CodeGitNoUpstream, code)
	}
}

func TestPullRepo_NoUpstream(t *testing.T) {
	root := copyFixture(t, "valid")
	initCommittedGitRepo(t, root)

	err := PullRepo(root)
	if err == nil {
		t.Fatal("expected an error pulling with no upstream configured")
	}
	if code := codeOf(t, err); code != CodeGitNoUpstream {
		t.Errorf("expected code %q, got %q", CodeGitNoUpstream, code)
	}
}

func TestPushAndPullRepo_RoundTrip(t *testing.T) {
	bare := t.TempDir()
	runGitT(t, bare, "init", "-q", "--bare", "-b", "main")

	// One clone commits and pushes...
	work1 := copyFixture(t, "valid")
	initCommittedGitRepo(t, work1)
	runGitT(t, work1, "remote", "add", "origin", bare)
	runGitT(t, work1, "push", "-q", "-u", "origin", "main")

	if err := os.WriteFile(filepath.Join(work1, "untracked.md"), []byte("new\n"), 0o644); err != nil {
		t.Fatalf("writing untracked.md: %v", err)
	}
	if err := StageAll(work1); err != nil {
		t.Fatalf("StageAll() returned error: %v", err)
	}
	if err := SaveIdentity(work1, Identity{Name: "Ada", Email: "ada@example.com"}); err != nil {
		t.Fatalf("SaveIdentity() returned error: %v", err)
	}
	if err := CommitStaged(work1, "add untracked.md"); err != nil {
		t.Fatalf("CommitStaged() returned error: %v", err)
	}
	if err := PushRepo(work1); err != nil {
		t.Fatalf("PushRepo() returned error: %v", err)
	}

	// ...the other clone pulls and sees it.
	work2 := t.TempDir()
	runGitT(t, filepath.Dir(work2), "clone", "-q", "-b", "main", bare, work2)

	if err := PullRepo(work2); err != nil {
		t.Fatalf("PullRepo() returned error: %v", err)
	}
	if _, err := os.Stat(filepath.Join(work2, "untracked.md")); err != nil {
		t.Errorf("expected untracked.md to exist after pulling, got: %v", err)
	}
}
