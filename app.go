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
