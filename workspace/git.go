package workspace

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

const gitCommandTimeout = 30 * time.Second

// GitFileChange is one file's state in GitStatus's staged or unstaged list.
type GitFileChange struct {
	Path   string `json:"path"`
	Status string `json:"status"` // "added" | "modified" | "deleted" | "renamed" | "copied" | "conflicted" | "untracked"
	// OrigPath is set only for a renamed/copied entry — the path it moved
	// from.
	OrigPath string `json:"origPath,omitempty"`
}

// GitStatus is the workspace tree's git status (GARNET-11) — status only,
// not a diff or a log; this app's git support is deliberately just enough
// to stop needing a terminal for stage/commit/push/pull.
type GitStatus struct {
	Branch      string          `json:"branch"`
	HasUpstream bool            `json:"hasUpstream"`
	Ahead       int             `json:"ahead"`
	Behind      int             `json:"behind"`
	Staged      []GitFileChange `json:"staged"`
	Unstaged    []GitFileChange `json:"unstaged"`
}

// runGit runs git in root, with extraEnv appended (e.g. commit author/
// committer overrides) — nil for the common case of none.
func runGit(root string, extraEnv []string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), gitCommandTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = root
	// No terminal to prompt into — fail fast on missing auth instead of
	// hanging the GUI waiting for input that can never arrive (same
	// reasoning as cloneRepo in repos.go).
	cmd.Env = append(append(os.Environ(), "GIT_TERMINAL_PROMPT=0"), extraEnv...)

	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(string(out)))
	}
	return string(out), nil
}

func ensureGitRepo(root string) error {
	if _, err := runGit(root, nil, "rev-parse", "--is-inside-work-tree"); err != nil {
		return errNotAGitRepo()
	}
	return nil
}

// hasUpstream reports whether the current branch has a configured upstream
// to push/pull against — checked up front so Push/Pull fail with a coded,
// actionable error instead of parsing git's (locale-dependent) stderr text.
func hasUpstream(root string) bool {
	_, err := runGit(root, nil, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
	return err == nil
}

// GetGitStatus reports the workspace tree's git status. This is a live
// query, not part of Workspace.Open — running `git status` on every
// workspace read would be overhead every caller pays for a panel most
// won't open.
func GetGitStatus(root string) (*GitStatus, error) {
	if err := ensureGitRepo(root); err != nil {
		return nil, err
	}
	out, err := runGit(root, nil, "status", "--porcelain=v2", "--branch", "-z")
	if err != nil {
		return nil, fmt.Errorf("git status: %w", err)
	}
	return parseGitStatus(out), nil
}

// parseGitStatus parses `git status --porcelain=v2 --branch -z` output.
// -z NUL-terminates records instead of newline-terminating them, which
// avoids porcelain v1's C-style quoting of paths with special characters —
// the price is that a rename/copy record's origPath rides as a second,
// separate NUL-terminated token right after it, which is why this walks
// tokens with an index instead of a plain range-over-split.
func parseGitStatus(out string) *GitStatus {
	status := &GitStatus{Staged: []GitFileChange{}, Unstaged: []GitFileChange{}}
	tokens := strings.Split(out, "\x00")

	for i := 0; i < len(tokens); i++ {
		tok := tokens[i]
		switch {
		case tok == "":
			continue // trailing empty token after the final NUL
		case strings.HasPrefix(tok, "# branch.head "):
			status.Branch = strings.TrimPrefix(tok, "# branch.head ")
		case strings.HasPrefix(tok, "# branch.upstream "):
			status.HasUpstream = true
		case strings.HasPrefix(tok, "# branch.ab "):
			parseAheadBehind(status, strings.TrimPrefix(tok, "# branch.ab "))
		case strings.HasPrefix(tok, "1 "):
			addOrdinaryEntry(status, tok)
		case strings.HasPrefix(tok, "2 "):
			// Ordinary fields plus a score, then the origPath as the next token.
			fields := strings.SplitN(tok, " ", 10)
			if len(fields) == 10 && i+1 < len(tokens) {
				i++
				addRenameEntry(status, fields[1], fields[9], tokens[i])
			}
		case strings.HasPrefix(tok, "u "):
			addConflictEntry(status, tok)
		case strings.HasPrefix(tok, "? "):
			status.Unstaged = append(status.Unstaged, GitFileChange{
				Path:   strings.TrimPrefix(tok, "? "),
				Status: "untracked",
			})
		}
	}
	return status
}

func parseAheadBehind(status *GitStatus, field string) {
	fields := strings.Fields(field)
	if len(fields) != 2 {
		return
	}
	status.Ahead, _ = strconv.Atoi(strings.TrimPrefix(fields[0], "+"))
	status.Behind, _ = strconv.Atoi(strings.TrimPrefix(fields[1], "-"))
}

// addOrdinaryEntry parses a "1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>"
// record — an add/modify/delete with no rename involved.
func addOrdinaryEntry(status *GitStatus, tok string) {
	fields := strings.SplitN(tok, " ", 9)
	if len(fields) != 9 {
		return
	}
	addChange(status, fields[1], fields[8], "")
}

func addRenameEntry(status *GitStatus, xy, path, origPath string) {
	addChange(status, xy, path, origPath)
}

// addConflictEntry parses a "u <XY> ..." unmerged record. Conflict
// resolution has no UI here (GARNET-11 explicitly excludes merge handling),
// so this only surfaces that the file needs attention outside the app.
func addConflictEntry(status *GitStatus, tok string) {
	fields := strings.SplitN(tok, " ", 11)
	if len(fields) != 11 {
		return
	}
	status.Unstaged = append(status.Unstaged, GitFileChange{Path: fields[10], Status: "conflicted"})
}

// addChange splits a two-letter XY status code into its staged (X) and
// unstaged (Y) halves — a file can be in both lists at once (staged one
// change, then modified again in the worktree).
func addChange(status *GitStatus, xy, path, origPath string) {
	if len(xy) != 2 {
		return
	}
	if xy[0] != '.' {
		status.Staged = append(status.Staged, GitFileChange{Path: path, Status: statusLabel(xy[0]), OrigPath: origPath})
	}
	if xy[1] != '.' {
		status.Unstaged = append(status.Unstaged, GitFileChange{Path: path, Status: statusLabel(xy[1]), OrigPath: origPath})
	}
}

func statusLabel(code byte) string {
	switch code {
	case 'A':
		return "added"
	case 'D':
		return "deleted"
	case 'R':
		return "renamed"
	case 'C':
		return "copied"
	default: // 'M' and 'T' (typechange) both read as a plain edit in v1 scope
		return "modified"
	}
}

// StageAll stages every change in the workspace tree, tracked and untracked.
func StageAll(root string) error {
	if err := ensureGitRepo(root); err != nil {
		return err
	}
	if _, err := runGit(root, nil, "add", "-A"); err != nil {
		return fmt.Errorf("git add: %w", err)
	}
	return nil
}

// StagePaths stages exactly the given workspace-root-relative paths.
func StagePaths(root string, paths []string) error {
	if len(paths) == 0 {
		return nil
	}
	if err := ensureGitRepo(root); err != nil {
		return err
	}
	args := append([]string{"add", "--"}, paths...)
	if _, err := runGit(root, nil, args...); err != nil {
		return fmt.Errorf("git add: %w", err)
	}
	return nil
}

// CommitStaged commits whatever is currently staged. Requires an identity —
// ADR 0005 modeled Identity as name+email specifically so it matches git's
// own convention, so a Garnet commit is attributed through
// GIT_AUTHOR_*/GIT_COMMITTER_* rather than left to whatever (if anything) is
// in the user's global gitconfig.
func CommitStaged(root, message string) error {
	trimmed := strings.TrimSpace(message)
	if trimmed == "" {
		return errCommitMessageRequired()
	}
	if err := ensureGitRepo(root); err != nil {
		return err
	}

	identity, err := LoadIdentity(root)
	if err != nil {
		return fmt.Errorf("loading identity: %w", err)
	}
	if identity == nil {
		return errIdentityRequired("committing")
	}

	env := []string{
		"GIT_AUTHOR_NAME=" + identity.Name, "GIT_AUTHOR_EMAIL=" + identity.Email,
		"GIT_COMMITTER_NAME=" + identity.Name, "GIT_COMMITTER_EMAIL=" + identity.Email,
	}
	if _, err := runGit(root, env, "commit", "-m", trimmed); err != nil {
		return fmt.Errorf("git commit: %w", err)
	}
	return nil
}

// PushRepo pushes the current branch to its upstream. Credentials (SSH
// agent, git credential helper) are assumed to already be configured
// outside Garnet — this doesn't manage auth itself.
func PushRepo(root string) error {
	if err := ensureGitRepo(root); err != nil {
		return err
	}
	if !hasUpstream(root) {
		return errGitNoUpstream()
	}
	if _, err := runGit(root, nil, "push"); err != nil {
		return fmt.Errorf("git push: %w", err)
	}
	return nil
}

// PullRepo fast-forwards the current branch from its upstream. --ff-only
// on purpose: a real merge/conflict has no resolution UI here (GARNET-11
// explicitly excludes that), so a pull that can't fast-forward fails
// loudly instead of leaving the tree in a conflicted state this app can't
// help finish.
func PullRepo(root string) error {
	if err := ensureGitRepo(root); err != nil {
		return err
	}
	if !hasUpstream(root) {
		return errGitNoUpstream()
	}
	if _, err := runGit(root, nil, "pull", "--ff-only"); err != nil {
		return fmt.Errorf("git pull: %w", err)
	}
	return nil
}
