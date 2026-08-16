package main

import (
	"context"

	"garnet/workspace"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// coded normalizes a workspace error into the wire form the frontend decodes
// into a translated message. Written to wrap a call's whole result — as in
// `return coded(workspace.CreateIssue(...))` — so binding methods stay
// one-liners. See workspace/errors.go and AGENTS.md rules 1 and 9.
func coded[T any](v T, err error) (T, error) {
	return v, workspace.EncodeError(err)
}

// codedOnly is coded for the methods that return an error and nothing else.
func codedOnly(err error) error {
	return workspace.EncodeError(err)
}

// SelectWorkspaceFolder prompts the user to pick a workspace directory via
// the native folder dialog. It returns "" (no error) if the user cancels.
//
// title comes from the caller because this is the one string the Go side puts
// on screen itself, and the translation catalog lives in the frontend
// (AGENTS.md rules 9 and 10).
func (a *App) SelectWorkspaceFolder(title string) (string, error) {
	return wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: title,
	})
}

// OpenWorkspace reads the workspace rooted at path from disk.
func (a *App) OpenWorkspace(path string) (*workspace.Workspace, error) {
	return coded(workspace.Open(path))
}

// GetIdentity returns the identity configured for the workspace at path, or
// nil if none has been set up yet.
func (a *App) GetIdentity(path string) (*workspace.Identity, error) {
	return coded(workspace.LoadIdentity(path))
}

// SetIdentity configures "who am I" for the workspace at path.
func (a *App) SetIdentity(path, name, email string) error {
	return codedOnly(workspace.SaveIdentity(path, workspace.Identity{Name: name, Email: email}))
}

// CreateIssue creates a new issue under projectKey in the workspace at path.
func (a *App) CreateIssue(path, projectKey, issueType, title string) (*workspace.Issue, error) {
	return coded(workspace.CreateIssue(path, projectKey, issueType, title))
}

// UpdateIssueBody overwrites an issue's issue.md.
func (a *App) UpdateIssueBody(path, issueID, body string) error {
	return codedOnly(workspace.UpdateIssueBody(path, issueID, body))
}

// SetIssueTitle renames an issue.
func (a *App) SetIssueTitle(path, issueID, title string) (*workspace.Issue, error) {
	return coded(workspace.SetIssueTitle(path, issueID, title))
}

// TransitionIssueStatus moves an issue to a new status, validated against
// its project's workflow when one is declared.
func (a *App) TransitionIssueStatus(path, issueID, newStatus string) (*workspace.Issue, error) {
	return coded(workspace.TransitionIssueStatus(path, issueID, newStatus))
}

// ToggleTodo flips the checked state of the task-list item at line within
// an issue's description.
func (a *App) ToggleTodo(path, issueID string, line int) (*workspace.Issue, error) {
	return coded(workspace.ToggleTodo(path, issueID, line))
}

// SetIssueAssignee sets an issue's assignee.
func (a *App) SetIssueAssignee(path, issueID, email string) (*workspace.Issue, error) {
	return coded(workspace.SetIssueAssignee(path, issueID, email))
}

// SetIssueParent sets an issue's parent.
func (a *App) SetIssueParent(path, issueID, parentID string) (*workspace.Issue, error) {
	return coded(workspace.SetIssueParent(path, issueID, parentID))
}

// AddIssueLink appends a typed link from one issue to another.
func (a *App) AddIssueLink(path, issueID, linkType, target string) (*workspace.Issue, error) {
	return coded(workspace.AddIssueLink(path, issueID, linkType, target))
}

// AddProjectMember registers a person against a project, so they become
// assignable — see SetIssueAssignee.
func (a *App) AddProjectMember(path, projectKey, name, email string) (*workspace.Project, error) {
	return coded(workspace.AddProjectMember(path, projectKey, name, email))
}

// AddTimelineNote appends a manual note to an issue's timeline.
func (a *App) AddTimelineNote(path, issueID, body string) (*workspace.Issue, error) {
	return coded(workspace.AddTimelineNote(path, issueID, body))
}

// ReadDocument returns a document's raw content.
func (a *App) ReadDocument(path, relPath string) (string, error) {
	return coded(workspace.ReadDocument(path, relPath))
}

// WriteDocument creates or overwrites a document.
func (a *App) WriteDocument(path, relPath, content string) error {
	return codedOnly(workspace.WriteDocument(path, relPath, content))
}

// SetProjectIssueTypes replaces a project's declared issue types.
func (a *App) SetProjectIssueTypes(path, projectKey string, types []string) (*workspace.Project, error) {
	return coded(workspace.SetProjectIssueTypes(path, projectKey, types))
}

// SetWorkflow replaces a project's workflow.md.
func (a *App) SetWorkflow(path, projectKey string, statuses []workspace.Status, transitions []workspace.Transition) (*workspace.Project, error) {
	return coded(workspace.SetWorkflow(path, projectKey, statuses, transitions))
}

// ArchiveProject hides a project from the default switcher without
// deleting anything.
func (a *App) ArchiveProject(path, projectKey string) (*workspace.Project, error) {
	return coded(workspace.ArchiveProject(path, projectKey))
}

// UnarchiveProject reverses ArchiveProject.
func (a *App) UnarchiveProject(path, projectKey string) (*workspace.Project, error) {
	return coded(workspace.UnarchiveProject(path, projectKey))
}

// AddProjectRepo declares a code repository for a project.
func (a *App) AddProjectRepo(path, projectKey, url, repoPath string) (*workspace.Project, error) {
	return coded(workspace.AddProjectRepo(path, projectKey, url, repoPath))
}

// RemoveProjectRepo un-declares a repo (does not delete anything already cloned).
func (a *App) RemoveProjectRepo(path, projectKey, repoPath string) (*workspace.Project, error) {
	return coded(workspace.RemoveProjectRepo(path, projectKey, repoPath))
}

// CloneProjectRepos clones every repo a project declares into repos/,
// skipping ones already present.
func (a *App) CloneProjectRepos(path, projectKey string) (*workspace.CloneResult, error) {
	return coded(workspace.CloneProjectRepos(path, projectKey))
}
