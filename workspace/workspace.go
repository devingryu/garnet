// Package workspace reads a Garnet workspace — the git-tracked tree of
// projects/, issues/, and documents described in ADR 0002 and ADR 0003 —
// from disk. It has no server-side validation: malformed items are
// collected as warnings rather than failing the whole load, per ADR 0001.
package workspace

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"sort"
)

// Workspace is the result of reading a workspace directory from disk.
type Workspace struct {
	Root      string     `json:"root"`
	Projects  []Project  `json:"projects"`
	Issues    []Issue    `json:"issues"`
	Documents []Document `json:"documents"`
	// Users is the registry from users.yaml (ADR 0009) — display names and
	// external links for reporter/assignee/timeline actors.
	Users []User `json:"users"`
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
		Users:     []User{},
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
		assignChildren(ws.Issues)
	}

	documents, err := ListDocuments(root)
	if err != nil {
		return nil, fmt.Errorf("listing documents: %w", err)
	}
	ws.Documents = documents

	users, err := loadUsers(root)
	if err != nil {
		return nil, fmt.Errorf("loading users.yaml: %w", err)
	}
	ws.Users = users

	entries, linkWarnings := buildLinkIndex(root, ws.Issues, ws.Documents)
	ws.Backlinks = entries
	ws.Warnings = append(ws.Warnings, linkWarnings...)

	ws.Warnings = append(ws.Warnings, undeclaredFieldWarnings(ws.Projects, ws.Issues)...)

	return ws, nil
}

// undeclaredFieldWarnings flags an issue whose status or type its own
// project no longer declares — the state a status/issue-type rename or
// delete can leave behind if it isn't (or can't be, for a hand-edited
// project.md/workflow.md) rewritten across every issue holding the old
// value. Same tolerance as GARNET-28's dangling links: not an error, just
// something worth a warning banner. A project with no workflow at all
// isn't flagged — nothing is declared, so nothing can be undeclared.
func undeclaredFieldWarnings(projects []Project, issues []Issue) []string {
	byKey := make(map[string]*Project, len(projects))
	for i := range projects {
		byKey[projects[i].Key] = &projects[i]
	}

	var warnings []string
	for _, issue := range issues {
		project := byKey[issue.ProjectKey]
		if project == nil {
			continue
		}
		if issue.Status != "" && project.Workflow != nil && len(project.Workflow.Statuses) > 0 {
			declared := false
			for _, s := range project.Workflow.Statuses {
				if s.ID == issue.Status {
					declared = true
					break
				}
			}
			if !declared {
				warnings = append(warnings, fmt.Sprintf(
					"issue %q has status %q, which project %q no longer declares",
					issue.ID, issue.Status, issue.ProjectKey))
			}
		}
		if issue.Type != "" && len(project.IssueTypes) > 0 && !slices.Contains(project.IssueTypes, issue.Type) {
			warnings = append(warnings, fmt.Sprintf(
				"issue %q has type %q, which project %q no longer declares",
				issue.ID, issue.Type, issue.ProjectKey))
		}
	}
	return warnings
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
