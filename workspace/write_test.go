package workspace

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func setIdentity(t *testing.T, root string) {
	t.Helper()
	if err := SaveIdentity(root, Identity{Name: "Test User", Email: "test@example.com"}); err != nil {
		t.Fatalf("SaveIdentity() returned error: %v", err)
	}
}

func TestCreateIssue_Success(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	issue, err := CreateIssue(root, "GRNT", "task", "Test issue")
	if err != nil {
		t.Fatalf("CreateIssue() returned error: %v", err)
	}

	if issue.ID != "GRNT-3" {
		t.Errorf("expected ID GRNT-3 (GRNT-1 and GRNT-2 already exist), got %q", issue.ID)
	}
	if issue.ProjectKey != "GRNT" {
		t.Errorf("expected ProjectKey GRNT, got %q", issue.ProjectKey)
	}
	if issue.Status != "todo" {
		t.Errorf("expected initial status 'todo' (workflow's first status), got %q", issue.Status)
	}
	if issue.Reporter != "test@example.com" {
		t.Errorf("expected reporter from identity, got %q", issue.Reporter)
	}
	if issue.Title != "Test issue" {
		t.Errorf("expected title 'Test issue', got %q", issue.Title)
	}
	if issue.Description != "" {
		t.Errorf("expected empty issue.md, got %q", issue.Description)
	}

	if _, err := os.Stat(filepath.Join(root, "issues", "GRNT-3", "issue.md")); err != nil {
		t.Errorf("expected issue.md to exist: %v", err)
	}
}

func TestCreateIssue_IDIncrements(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	first, err := CreateIssue(root, "GRNT", "task", "Test issue")
	if err != nil {
		t.Fatalf("CreateIssue() #1 returned error: %v", err)
	}
	second, err := CreateIssue(root, "GRNT", "task", "Test issue")
	if err != nil {
		t.Fatalf("CreateIssue() #2 returned error: %v", err)
	}

	if first.ID != "GRNT-3" || second.ID != "GRNT-4" {
		t.Errorf("expected GRNT-3 then GRNT-4, got %q then %q", first.ID, second.ID)
	}
}

func TestCreateIssue_InvalidType(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	if _, err := CreateIssue(root, "GRNT", "not-a-declared-type", "Title"); err == nil {
		t.Fatal("expected an error for an undeclared issue type, got nil")
	}
}

func TestCreateIssue_RequiresTitle(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	if _, err := CreateIssue(root, "GRNT", "task", ""); err == nil {
		t.Fatal("expected an error for an empty title, got nil")
	}
	if _, err := CreateIssue(root, "GRNT", "task", "   "); err == nil {
		t.Fatal("expected an error for a whitespace-only title, got nil")
	}
}

func TestCreateIssue_NoIdentity(t *testing.T) {
	root := copyFixture(t, "valid")
	// deliberately no setIdentity(t, root)

	if _, err := CreateIssue(root, "GRNT", "task", "Test issue"); err == nil {
		t.Fatal("expected an error when no identity is configured, got nil")
	}
}

func TestCreateIssue_NoWorkflowOrIssueTypes(t *testing.T) {
	root := copyFixture(t, "valid-no-warnings")
	setIdentity(t, root)

	issue, err := CreateIssue(root, "GRNT", "whatever", "Title")
	if err != nil {
		t.Fatalf("CreateIssue() returned error: %v", err)
	}
	if issue.Status != "" {
		t.Errorf("expected empty initial status with no workflow, got %q", issue.Status)
	}
}

func TestUpdateIssueBody(t *testing.T) {
	root := copyFixture(t, "valid")

	if err := UpdateIssueBody(root, "GRNT-1", "# Updated\n\nNew content.\n"); err != nil {
		t.Fatalf("UpdateIssueBody() returned error: %v", err)
	}

	issue, err := loadIssue(filepath.Join(root, "issues", "GRNT-1"), "GRNT-1")
	if err != nil {
		t.Fatalf("loadIssue() returned error: %v", err)
	}
	if !strings.Contains(issue.Description, "Updated") {
		t.Errorf("expected updated body, got %q", issue.Description)
	}
}

func TestUpdateIssueBody_NotFound(t *testing.T) {
	root := copyFixture(t, "valid")
	if err := UpdateIssueBody(root, "GRNT-999", "body"); err == nil {
		t.Fatal("expected an error for a nonexistent issue, got nil")
	}
}

func TestAddTimelineNote(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	issue, err := AddTimelineNote(root, "GRNT-1", "Parked pending review.")
	if err != nil {
		t.Fatalf("AddTimelineNote() returned error: %v", err)
	}
	if len(issue.Timeline) != 3 { // 2 from the fixture + this note
		t.Fatalf("expected 3 timeline entries, got %d: %+v", len(issue.Timeline), issue.Timeline)
	}
	entry := issue.Timeline[len(issue.Timeline)-1]
	if entry.Kind != "note" || entry.Body != "Parked pending review." {
		t.Errorf("unexpected timeline entry: %+v", entry)
	}
	if entry.By != "test@example.com" {
		t.Errorf("expected entry attributed to identity, got %q", entry.By)
	}
	// Status change fields shouldn't leak into a note entry.
	if entry.From != "" || entry.To != "" {
		t.Errorf("expected empty From/To on a note entry, got %+v", entry)
	}
}

func TestAddTimelineNote_RequiresIdentity(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := AddTimelineNote(root, "GRNT-1", "note"); err == nil {
		t.Fatal("expected an error when no identity is configured, got nil")
	}
}

func TestAddTimelineNote_RequiresBody(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)
	if _, err := AddTimelineNote(root, "GRNT-1", "   "); err == nil {
		t.Fatal("expected an error for a whitespace-only note, got nil")
	}
}

func TestAddTimelineNote_NotFound(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)
	if _, err := AddTimelineNote(root, "GRNT-999", "note"); err == nil {
		t.Fatal("expected an error for a nonexistent issue, got nil")
	}
}

func TestSetIssueTitle(t *testing.T) {
	root := copyFixture(t, "valid")

	issue, err := SetIssueTitle(root, "GRNT-1", "Renamed")
	if err != nil {
		t.Fatalf("SetIssueTitle() returned error: %v", err)
	}
	if issue.Title != "Renamed" {
		t.Errorf("expected title 'Renamed', got %q", issue.Title)
	}
}

func TestSetIssueTitle_RequiresTitle(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := SetIssueTitle(root, "GRNT-1", ""); err == nil {
		t.Fatal("expected an error for an empty title, got nil")
	}
}

func TestTransitionIssueStatus_Valid(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	issue, err := TransitionIssueStatus(root, "GRNT-1", "done")
	if err != nil {
		t.Fatalf("TransitionIssueStatus() returned error: %v", err)
	}
	if issue.Status != "done" {
		t.Errorf("expected status 'done', got %q", issue.Status)
	}
	if len(issue.Timeline) != 3 { // 2 from the fixture + this transition
		t.Fatalf("expected 3 timeline entries, got %d: %+v", len(issue.Timeline), issue.Timeline)
	}
	entry := issue.Timeline[len(issue.Timeline)-1]
	if entry.Kind != "status" || entry.From != "in-progress" || entry.To != "done" {
		t.Errorf("unexpected timeline entry: %+v", entry)
	}
	if entry.By != "test@example.com" {
		t.Errorf("expected entry attributed to identity, got %q", entry.By)
	}
	if entry.At.IsZero() {
		t.Error("expected entry.At to be set")
	}
}

func TestTransitionIssueStatus_RequiresIdentity(t *testing.T) {
	root := copyFixture(t, "valid")
	// deliberately no setIdentity(t, root)
	if _, err := TransitionIssueStatus(root, "GRNT-1", "done"); err == nil {
		t.Fatal("expected an error when no identity is configured, got nil")
	}
}

func TestTransitionIssueStatus_InvalidTransition(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	// GRNT-1 starts "in-progress"; workflow only allows in-progress -> {todo, done}.
	if _, err := TransitionIssueStatus(root, "GRNT-1", "in-progress"); err == nil {
		t.Fatal("expected an error for a transition not declared in workflow.md, got nil")
	}
}

func TestTransitionIssueStatus_UnknownStatus(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)
	if _, err := TransitionIssueStatus(root, "GRNT-1", "not-a-real-status"); err == nil {
		t.Fatal("expected an error for a status not declared by the workflow, got nil")
	}
}

func TestTransitionIssueStatus_NoWorkflowAllowsAnything(t *testing.T) {
	root := copyFixture(t, "valid-no-warnings")
	setIdentity(t, root)

	issue, err := TransitionIssueStatus(root, "GRNT-1", "anything-goes")
	if err != nil {
		t.Fatalf("expected no validation without a workflow, got error: %v", err)
	}
	if issue.Status != "anything-goes" {
		t.Errorf("expected status 'anything-goes', got %q", issue.Status)
	}
}

func TestSetIssueAssignee(t *testing.T) {
	root := copyFixture(t, "valid")

	// The fixture project declares no members, so anything is accepted —
	// nothing to validate against, same pattern as issue types/workflow.
	issue, err := SetIssueAssignee(root, "GRNT-1", "new-assignee@example.com")
	if err != nil {
		t.Fatalf("SetIssueAssignee() returned error: %v", err)
	}
	if issue.Assignee != "new-assignee@example.com" {
		t.Errorf("unexpected assignee: %q", issue.Assignee)
	}
}

func TestSetIssueAssignee_RestrictedToMembers(t *testing.T) {
	root := copyFixture(t, "valid")

	if _, err := AddProjectMember(root, "GRNT", "Ada", "ada@example.com"); err != nil {
		t.Fatalf("AddProjectMember() returned error: %v", err)
	}

	if _, err := SetIssueAssignee(root, "GRNT-1", "not-a-member@example.com"); err == nil {
		t.Fatal("expected an error assigning a non-member once the project has declared members, got nil")
	}

	issue, err := SetIssueAssignee(root, "GRNT-1", "ada@example.com")
	if err != nil {
		t.Fatalf("SetIssueAssignee() returned error for a real member: %v", err)
	}
	if issue.Assignee != "ada@example.com" {
		t.Errorf("unexpected assignee: %q", issue.Assignee)
	}
}

func TestCreateProject_Success(t *testing.T) {
	root := copyFixture(t, "valid")

	project, err := CreateProject(root, "WIDG", "Widgets")
	if err != nil {
		t.Fatalf("CreateProject() returned error: %v", err)
	}
	if project.Key != "WIDG" || project.Name != "Widgets" {
		t.Errorf("expected key/name as given, got %+v", project)
	}
	if len(project.Repos) != 0 || len(project.IssueTypes) != 0 || len(project.Members) != 0 {
		t.Errorf("expected a brand new project to declare nothing yet, got %+v", project)
	}

	if _, err := os.Stat(filepath.Join(root, "projects", "WIDG", "project.md")); err != nil {
		t.Errorf("expected project.md to exist: %v", err)
	}

	// Round-trips through a fresh load, not just the in-memory return value.
	reloaded, err := loadProject(filepath.Join(root, "projects", "WIDG"))
	if err != nil {
		t.Fatalf("loadProject() returned error: %v", err)
	}
	if reloaded.Key != "WIDG" {
		t.Errorf("expected reloaded key WIDG, got %q", reloaded.Key)
	}
}

func TestCreateProject_RequiresKey(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := CreateProject(root, "", "Widgets"); err == nil {
		t.Fatal("expected an error for an empty key, got nil")
	}
}

func TestCreateProject_RequiresName(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := CreateProject(root, "WIDG", ""); err == nil {
		t.Fatal("expected an error for an empty name, got nil")
	}
}

func TestCreateProject_RejectsInvalidKey(t *testing.T) {
	root := copyFixture(t, "valid")
	for _, key := range []string{"WID-G", "WID/G", "../escape", "wid g"} {
		if _, err := CreateProject(root, key, "Widgets"); err == nil {
			t.Errorf("CreateProject(%q): expected an error, got nil", key)
		}
	}
}

func TestCreateProject_RejectsExistingKey(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := CreateProject(root, "GRNT", "Duplicate"); err == nil {
		t.Fatal("expected an error creating a project at an already-used key, got nil")
	}
}

func TestAddProjectMember(t *testing.T) {
	root := copyFixture(t, "valid")

	project, err := AddProjectMember(root, "GRNT", "Ada", "ada@example.com")
	if err != nil {
		t.Fatalf("AddProjectMember() returned error: %v", err)
	}
	if len(project.Members) != 1 || project.Members[0].Email != "ada@example.com" {
		t.Errorf("unexpected members: %+v", project.Members)
	}
	// project.md's other fields and free-form body must survive the round-trip.
	if project.Key != "GRNT" || project.Name != "Garnet" {
		t.Errorf("expected key/name preserved, got %+v", project)
	}
	if !strings.Contains(project.Description, "local-first project management app") {
		t.Errorf("expected description body preserved, got %q", project.Description)
	}
	if len(project.IssueTypes) != 4 {
		t.Errorf("expected issue-types preserved, got %+v", project.IssueTypes)
	}
}

func TestAddProjectMember_DuplicateEmail(t *testing.T) {
	root := copyFixture(t, "valid")

	if _, err := AddProjectMember(root, "GRNT", "Ada", "ada@example.com"); err != nil {
		t.Fatalf("AddProjectMember() #1 returned error: %v", err)
	}
	if _, err := AddProjectMember(root, "GRNT", "Ada Again", "ada@example.com"); err == nil {
		t.Fatal("expected an error adding a duplicate member email, got nil")
	}
}

func TestSetIssueParent(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)
	parent, err := CreateIssue(root, "GRNT", "task", "Test issue")
	if err != nil {
		t.Fatalf("CreateIssue() returned error: %v", err)
	}

	issue, err := SetIssueParent(root, "GRNT-1", parent.ID)
	if err != nil {
		t.Fatalf("SetIssueParent() returned error: %v", err)
	}
	if issue.Parent != parent.ID {
		t.Errorf("expected parent %q, got %q", parent.ID, issue.Parent)
	}
}

func TestSetIssueParent_InvalidTarget(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := SetIssueParent(root, "GRNT-1", "GRNT-999"); err == nil {
		t.Fatal("expected an error for a nonexistent parent, got nil")
	}
}

func TestAddIssueLink(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)
	target, err := CreateIssue(root, "GRNT", "task", "Test issue")
	if err != nil {
		t.Fatalf("CreateIssue() returned error: %v", err)
	}

	issue, err := AddIssueLink(root, "GRNT-1", "blocks", target.ID)
	if err != nil {
		t.Fatalf("AddIssueLink() returned error: %v", err)
	}
	if len(issue.Links) != 2 { // GRNT-1 already has one link in the fixture
		t.Fatalf("expected 2 links, got %d: %+v", len(issue.Links), issue.Links)
	}
	last := issue.Links[len(issue.Links)-1]
	if last.Type != "blocks" || last.Target != target.ID {
		t.Errorf("unexpected new link: %+v", last)
	}
}

func TestAddIssueLink_InvalidTarget(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := AddIssueLink(root, "GRNT-1", "blocks", "GRNT-999"); err == nil {
		t.Fatal("expected an error for a nonexistent link target, got nil")
	}
}

func TestIdentity_RoundTrip(t *testing.T) {
	root := copyFixture(t, "valid")

	id, err := LoadIdentity(root)
	if err != nil {
		t.Fatalf("LoadIdentity() returned error: %v", err)
	}
	if id != nil {
		t.Fatalf("expected nil identity before any is set, got %+v", id)
	}

	if err := SaveIdentity(root, Identity{Name: "devingryu", Email: "devingryu@korea.ac.kr"}); err != nil {
		t.Fatalf("SaveIdentity() returned error: %v", err)
	}

	id, err = LoadIdentity(root)
	if err != nil {
		t.Fatalf("LoadIdentity() returned error: %v", err)
	}
	if id == nil || id.Name != "devingryu" || id.Email != "devingryu@korea.ac.kr" {
		t.Errorf("unexpected identity after save: %+v", id)
	}

	gitignore, err := os.ReadFile(filepath.Join(root, ".gitignore"))
	if err != nil {
		t.Fatalf("expected .gitignore to be created: %v", err)
	}
	if !strings.Contains(string(gitignore), ".garnet.local.yaml") {
		t.Errorf(".gitignore does not cover .garnet.local.yaml: %q", gitignore)
	}
}

func TestIdentity_GitignoreAppendsWithoutDuplicating(t *testing.T) {
	root := copyFixture(t, "valid")
	if err := os.WriteFile(filepath.Join(root, ".gitignore"), []byte("node_modules\n"), 0o644); err != nil {
		t.Fatalf("writing pre-existing .gitignore: %v", err)
	}

	if err := SaveIdentity(root, Identity{Name: "a", Email: "a@example.com"}); err != nil {
		t.Fatalf("SaveIdentity() #1 returned error: %v", err)
	}
	if err := SaveIdentity(root, Identity{Name: "a", Email: "a@example.com"}); err != nil {
		t.Fatalf("SaveIdentity() #2 returned error: %v", err)
	}

	raw, err := os.ReadFile(filepath.Join(root, ".gitignore"))
	if err != nil {
		t.Fatalf("reading .gitignore: %v", err)
	}
	content := string(raw)

	if !strings.Contains(content, "node_modules") {
		t.Errorf("expected pre-existing .gitignore content to be preserved: %q", content)
	}
	if strings.Count(content, ".garnet.local.yaml") != 1 {
		t.Errorf("expected exactly one .garnet.local.yaml entry, got: %q", content)
	}
}

func TestSetProjectIssueTypes(t *testing.T) {
	root := copyFixture(t, "valid")

	project, err := SetProjectIssueTypes(root, "GRNT", []string{"task", "chore"})
	if err != nil {
		t.Fatalf("SetProjectIssueTypes() returned error: %v", err)
	}
	if len(project.IssueTypes) != 2 || project.IssueTypes[0] != "task" || project.IssueTypes[1] != "chore" {
		t.Errorf("unexpected issue types: %+v", project.IssueTypes)
	}
	// Other fields survive the round-trip.
	if project.Key != "GRNT" || len(project.Repos) != 1 {
		t.Errorf("expected other fields preserved, got %+v", project)
	}
}

func TestSetWorkflow(t *testing.T) {
	root := copyFixture(t, "valid")

	statuses := []Status{
		{ID: "todo", Name: "To Do", Category: "open"},
		{ID: "done", Name: "Done", Category: "closed"},
	}
	transitions := []Transition{{From: "todo", To: []string{"done"}}}

	project, err := SetWorkflow(root, "GRNT", statuses, transitions)
	if err != nil {
		t.Fatalf("SetWorkflow() returned error: %v", err)
	}
	if project.Workflow == nil || len(project.Workflow.Statuses) != 2 || len(project.Workflow.Transitions) != 1 {
		t.Fatalf("unexpected workflow: %+v", project.Workflow)
	}
}

func TestSetWorkflow_RejectsUndeclaredStatus(t *testing.T) {
	root := copyFixture(t, "valid")

	statuses := []Status{{ID: "todo", Name: "To Do", Category: "open"}}
	transitions := []Transition{{From: "todo", To: []string{"nonexistent"}}}

	if _, err := SetWorkflow(root, "GRNT", statuses, transitions); err == nil {
		t.Fatal("expected an error for a transition referencing an undeclared status, got nil")
	}
}

func TestArchiveProject_RoundTrip(t *testing.T) {
	root := copyFixture(t, "valid")

	project, err := ArchiveProject(root, "GRNT")
	if err != nil {
		t.Fatalf("ArchiveProject() returned error: %v", err)
	}
	if !project.Archived {
		t.Error("expected Archived=true")
	}

	project, err = UnarchiveProject(root, "GRNT")
	if err != nil {
		t.Fatalf("UnarchiveProject() returned error: %v", err)
	}
	if project.Archived {
		t.Error("expected Archived=false")
	}
}

func TestAddRemoveProjectRepo(t *testing.T) {
	root := copyFixture(t, "valid")

	project, err := AddProjectRepo(root, "GRNT", "https://example.com/other.git", "other")
	if err != nil {
		t.Fatalf("AddProjectRepo() returned error: %v", err)
	}
	if len(project.Repos) != 2 { // fixture already declares one
		t.Fatalf("expected 2 repos, got %d: %+v", len(project.Repos), project.Repos)
	}

	project, err = RemoveProjectRepo(root, "GRNT", "other")
	if err != nil {
		t.Fatalf("RemoveProjectRepo() returned error: %v", err)
	}
	if len(project.Repos) != 1 {
		t.Fatalf("expected 1 repo after removal, got %d: %+v", len(project.Repos), project.Repos)
	}
}

func TestAddProjectRepo_RejectsDuplicatePath(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := AddProjectRepo(root, "GRNT", "https://example.com/x.git", "garnet"); err == nil {
		t.Fatal("expected an error for a duplicate repo path, got nil")
	}
}

func TestRemoveProjectRepo_NotFound(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := RemoveProjectRepo(root, "GRNT", "does-not-exist"); err == nil {
		t.Fatal("expected an error for a nonexistent repo path, got nil")
	}
}
