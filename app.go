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

// SelectWorkspaceFolder prompts the user to pick a workspace directory via
// the native folder dialog. It returns "" (no error) if the user cancels.
func (a *App) SelectWorkspaceFolder() (string, error) {
	return wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: "Open Garnet Workspace",
	})
}

// OpenWorkspace reads the workspace rooted at path from disk.
func (a *App) OpenWorkspace(path string) (*workspace.Workspace, error) {
	return workspace.Open(path)
}

// GetIdentity returns the identity configured for the workspace at path, or
// nil if none has been set up yet.
func (a *App) GetIdentity(path string) (*workspace.Identity, error) {
	return workspace.LoadIdentity(path)
}

// SetIdentity configures "who am I" for the workspace at path.
func (a *App) SetIdentity(path, name, email string) error {
	return workspace.SaveIdentity(path, workspace.Identity{Name: name, Email: email})
}

// CreateIssue creates a new issue under projectKey in the workspace at path.
func (a *App) CreateIssue(path, projectKey, issueType, title string) (*workspace.Issue, error) {
	return workspace.CreateIssue(path, projectKey, issueType, title)
}

// UpdateIssueBody overwrites an issue's issue.md.
func (a *App) UpdateIssueBody(path, issueID, body string) error {
	return workspace.UpdateIssueBody(path, issueID, body)
}

// SetIssueTitle renames an issue.
func (a *App) SetIssueTitle(path, issueID, title string) (*workspace.Issue, error) {
	return workspace.SetIssueTitle(path, issueID, title)
}

// TransitionIssueStatus moves an issue to a new status, validated against
// its project's workflow when one is declared.
func (a *App) TransitionIssueStatus(path, issueID, newStatus string) (*workspace.Issue, error) {
	return workspace.TransitionIssueStatus(path, issueID, newStatus)
}

// SetIssueAssignee sets an issue's assignee.
func (a *App) SetIssueAssignee(path, issueID, email string) (*workspace.Issue, error) {
	return workspace.SetIssueAssignee(path, issueID, email)
}

// SetIssueParent sets an issue's parent.
func (a *App) SetIssueParent(path, issueID, parentID string) (*workspace.Issue, error) {
	return workspace.SetIssueParent(path, issueID, parentID)
}

// AddIssueLink appends a typed link from one issue to another.
func (a *App) AddIssueLink(path, issueID, linkType, target string) (*workspace.Issue, error) {
	return workspace.AddIssueLink(path, issueID, linkType, target)
}

// AddProjectMember registers a person against a project, so they become
// assignable — see SetIssueAssignee.
func (a *App) AddProjectMember(path, projectKey, name, email string) (*workspace.Project, error) {
	return workspace.AddProjectMember(path, projectKey, name, email)
}
