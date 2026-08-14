package workspace

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const cloneTimeout = 2 * time.Minute

// CloneResult is CloneProjectRepos's outcome. A struct rather than two bare
// slices, matching the (value, error) shape every other Wails-bound method
// in this codebase uses — returning multiple non-error values isn't a
// pattern used anywhere else here, so this avoids being the first to find
// out whether the binding generator handles it cleanly.
type CloneResult struct {
	// Cloned lists repo paths that ended up present under repos/, whether
	// freshly cloned or already there.
	Cloned []string `json:"cloned"`
	// Warnings lists per-repo failures. One bad URL doesn't block the rest.
	Warnings []string `json:"warnings"`
}

// CloneProjectRepos clones every repo a project declares into repos/<path>,
// skipping any that already exist there.
func CloneProjectRepos(root, projectKey string) (*CloneResult, error) {
	result := &CloneResult{Cloned: []string{}, Warnings: []string{}}

	project, err := loadProject(filepath.Join(root, "projects", projectKey))
	if err != nil {
		return nil, errProjectLoadFailed(projectKey, err)
	}

	if len(project.Repos) == 0 {
		return result, nil
	}

	// repos/ hasn't had anything else write to the workspace .gitignore for
	// it yet — do that here, once, before the first clone.
	if err := ensureGitignored(root, "repos/"); err != nil {
		result.Warnings = append(result.Warnings, fmt.Sprintf("updating .gitignore: %v", err))
	}

	for _, repo := range project.Repos {
		target := filepath.Join(root, "repos", repo.Path)
		if dirExists(target) {
			result.Cloned = append(result.Cloned, repo.Path)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			result.Warnings = append(result.Warnings, fmt.Sprintf("%s: %v", repo.Path, err))
			continue
		}

		if err := cloneRepo(repo.URL, target); err != nil {
			result.Warnings = append(result.Warnings, fmt.Sprintf("%s: %v", repo.Path, err))
			continue
		}
		result.Cloned = append(result.Cloned, repo.Path)
	}

	return result, nil
}

func cloneRepo(url, target string) error {
	ctx, cancel := context.WithTimeout(context.Background(), cloneTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "git", "clone", url, target)
	// No terminal to prompt into — fail fast on a bad URL or missing auth
	// instead of hanging the GUI waiting for input that can never arrive.
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")

	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(string(out)))
	}
	return nil
}
