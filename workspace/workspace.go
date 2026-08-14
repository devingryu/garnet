// Package workspace reads a Garnet workspace — the git-tracked tree of
// projects/, issues/, and documents described in ADR 0002 and ADR 0003 —
// from disk. It has no server-side validation: malformed items are
// collected as warnings rather than failing the whole load, per ADR 0001.
package workspace

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

// ErrNotAWorkspace is returned by Open when the given directory has neither
// a projects/ nor an issues/ subdirectory.
var ErrNotAWorkspace = errors.New("not a Garnet workspace: expected a \"projects\" or \"issues\" directory")

// Workspace is the result of reading a workspace directory from disk.
type Workspace struct {
	Root      string     `json:"root"`
	Projects  []Project  `json:"projects"`
	Issues    []Issue    `json:"issues"`
	Documents []Document `json:"documents"`
	// Backlinks is derived by scanning markdown links, never stored — see
	// ADR 0004 and buildLinkIndex.
	Backlinks []BacklinkEntry `json:"backlinks"`
	// Warnings lists items that failed to parse and were skipped, so a
	// single malformed file doesn't prevent the rest of the workspace
	// from loading.
	Warnings []string `json:"warnings"`
}

// Open reads the workspace rooted at path. It returns ErrNotAWorkspace if
// path doesn't look like a Garnet workspace at all; individual malformed
// projects or issues are instead reported in Workspace.Warnings.
func Open(root string) (*Workspace, error) {
	info, err := os.Stat(root)
	if err != nil {
		return nil, fmt.Errorf("opening workspace: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("opening workspace: %s is not a directory", root)
	}

	projectsDir := filepath.Join(root, "projects")
	issuesDir := filepath.Join(root, "issues")
	hasProjects := dirExists(projectsDir)
	hasIssues := dirExists(issuesDir)
	if !hasProjects && !hasIssues {
		return nil, ErrNotAWorkspace
	}

	// Slices start non-nil so they marshal to JSON `[]` rather than `null` —
	// frontend code can rely on .length always being defined.
	ws := &Workspace{
		Root:      root,
		Projects:  []Project{},
		Issues:    []Issue{},
		Documents: []Document{},
		Backlinks: []BacklinkEntry{},
		Warnings:  []string{},
	}

	if hasProjects {
		names, err := subdirNames(projectsDir)
		if err != nil {
			return nil, fmt.Errorf("reading projects directory: %w", err)
		}
		for _, name := range names {
			p, err := loadProject(filepath.Join(projectsDir, name))
			if err != nil {
				ws.Warnings = append(ws.Warnings, fmt.Sprintf("project %q: %v", name, err))
				continue
			}
			ws.Projects = append(ws.Projects, *p)
		}
	}

	if hasIssues {
		names, err := subdirNames(issuesDir)
		if err != nil {
			return nil, fmt.Errorf("reading issues directory: %w", err)
		}
		for _, name := range names {
			i, err := loadIssue(filepath.Join(issuesDir, name), name)
			if err != nil {
				ws.Warnings = append(ws.Warnings, fmt.Sprintf("issue %q: %v", name, err))
				continue
			}
			ws.Issues = append(ws.Issues, *i)
		}
	}

	documents, err := ListDocuments(root)
	if err != nil {
		return nil, fmt.Errorf("listing documents: %w", err)
	}
	ws.Documents = documents

	entries, linkWarnings := buildLinkIndex(root, ws.Issues, ws.Documents)
	ws.Backlinks = entries
	ws.Warnings = append(ws.Warnings, linkWarnings...)

	return ws, nil
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

// subdirNames returns the names of immediate subdirectories of dir, sorted,
// skipping dotfiles/dotdirs.
func subdirNames(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() || e.Name()[0] == '.' {
			continue
		}
		names = append(names, e.Name())
	}
	sort.Strings(names)
	return names, nil
}
