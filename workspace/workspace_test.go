package workspace

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func TestOpen_ValidWorkspace(t *testing.T) {
	ws, err := Open("testdata/valid")
	if err != nil {
		t.Fatalf("Open() returned error: %v", err)
	}

	if len(ws.Projects) != 1 {
		t.Fatalf("expected 1 project, got %d", len(ws.Projects))
	}
	p := ws.Projects[0]
	if p.Key != "GRNT" || p.Name != "Garnet" {
		t.Errorf("unexpected project: %+v", p)
	}
	if len(p.Repos) != 1 || p.Repos[0].URL != "https://github.com/devingryu/garnet.git" {
		t.Errorf("unexpected repos: %+v", p.Repos)
	}
	if len(p.IssueTypes) != 4 {
		t.Errorf("expected 4 issue types, got %+v", p.IssueTypes)
	}
	if !strings.Contains(p.Description, "local-first project management app") {
		t.Errorf("expected project description to carry the markdown body, got %q", p.Description)
	}
	if p.Workflow == nil || len(p.Workflow.Statuses) != 3 {
		t.Errorf("expected workflow with 3 statuses, got %+v", p.Workflow)
	}

	// GRNT-2 has deliberately malformed .garnet.yaml — it should be skipped
	// and reported as a warning, not fail the whole load (ADR 0001).
	if len(ws.Issues) != 1 {
		t.Fatalf("expected 1 successfully-loaded issue, got %d: %+v", len(ws.Issues), ws.Issues)
	}
	issue := ws.Issues[0]
	if issue.ID != "GRNT-1" {
		t.Errorf("expected issue ID GRNT-1, got %q", issue.ID)
	}
	if issue.Status != "in-progress" || issue.Type != "story" {
		t.Errorf("unexpected issue metadata: %+v", issue)
	}
	if issue.Title != "Workspace foundation" {
		t.Errorf("expected title 'Workspace foundation', got %q", issue.Title)
	}
	if len(issue.Links) != 1 || issue.Links[0].Target != "GRNT-5" {
		t.Errorf("unexpected links: %+v", issue.Links)
	}
	if len(issue.Timeline) != 2 {
		t.Errorf("expected 2 timeline entries, got %d", len(issue.Timeline))
	}
	if !strings.Contains(issue.Description, "Workspace foundation") {
		t.Errorf("expected issue.md content in Description, got %q", issue.Description)
	}
	if len(issue.Documents) != 1 || issue.Documents[0] != "notes.md" {
		t.Errorf("expected notes.md listed as an attached document, got %+v", issue.Documents)
	}

	if len(ws.Warnings) != 1 || !strings.Contains(ws.Warnings[0], "GRNT-2") {
		t.Errorf("expected exactly 1 warning mentioning GRNT-2, got %+v", ws.Warnings)
	}
}

// TestOpen_NoNullSlicesInJSON is a regression test: a nil Go slice marshals
// to JSON `null`, not `[]`. The frontend calls .length on these fields
// unconditionally (e.g. ws.warnings.length), so a `null` crashes the whole
// React tree with a blank screen the moment a workspace has zero warnings,
// zero repos, or an issue with no links/timeline — exactly the sparsest,
// most common case. Every slice field must always serialize as an array.
func TestOpen_NoNullSlicesInJSON(t *testing.T) {
	ws, err := Open("testdata/valid-no-warnings")
	if err != nil {
		t.Fatalf("Open() returned error: %v", err)
	}

	raw, err := json.Marshal(ws)
	if err != nil {
		t.Fatalf("Marshal() returned error: %v", err)
	}
	body := string(raw)

	for _, field := range []string{
		`"warnings":null`, `"projects":null`, `"issues":null`,
		`"repos":null`, `"issueTypes":null`,
		`"links":null`, `"timeline":null`, `"documents":null`,
		`"children":null`,
	} {
		if strings.Contains(body, field) {
			t.Errorf("found %q in marshaled JSON — this field must default to [], not nil: %s", field, body)
		}
	}
}

// TestOpen_Children covers the reverse of Parent, which is derived from the
// whole issue set rather than read off any one issue's .garnet.yaml.
func TestOpen_Children(t *testing.T) {
	root := copyFixture(t, "valid")
	writeChildIssue := func(id, parent string) {
		t.Helper()
		dir := filepath.Join(root, "issues", id)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatalf("creating %s: %v", id, err)
		}
		meta := "title: " + id + "\ntype: task\nstatus: todo\nparent: " + parent + "\n"
		if err := os.WriteFile(filepath.Join(dir, ".garnet.yaml"), []byte(meta), 0o644); err != nil {
			t.Fatalf("writing %s: %v", id, err)
		}
	}
	writeChildIssue("GRNT-3", "GRNT-1")
	writeChildIssue("GRNT-4", "GRNT-1")
	// Parented to itself: a cycle of one, which must not make it its own child.
	writeChildIssue("GRNT-5", "GRNT-5")

	ws, err := Open(root)
	if err != nil {
		t.Fatalf("Open() returned error: %v", err)
	}

	byID := map[string][]string{}
	for _, issue := range ws.Issues {
		byID[issue.ID] = issue.Children
	}
	if got := byID["GRNT-1"]; !slices.Equal(got, []string{"GRNT-3", "GRNT-4"}) {
		t.Errorf("expected GRNT-1's children to be [GRNT-3 GRNT-4], got %+v", got)
	}
	for _, id := range []string{"GRNT-3", "GRNT-4", "GRNT-5"} {
		if got := byID[id]; len(got) != 0 {
			t.Errorf("expected %s to have no children, got %+v", id, got)
		}
	}
}

func TestOpen_NotAWorkspace(t *testing.T) {
	_, err := Open("testdata/not-a-workspace")
	if !errors.Is(err, ErrNotAWorkspace) {
		t.Fatalf("expected ErrNotAWorkspace, got %v", err)
	}
}

func TestOpen_MissingDirectory(t *testing.T) {
	_, err := Open("testdata/does-not-exist")
	if err == nil {
		t.Fatal("expected an error for a nonexistent path, got nil")
	}
}
