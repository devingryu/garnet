import {useState} from 'react';
import {RotateCw} from 'lucide-react';
import {AppShell} from '@/components/app-shell';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {IdentitySetupDialog} from '@/components/identity-setup-dialog';
import {NewIssueDialog} from '@/components/new-issue-dialog';
import {IssueList} from '@/components/issue-list';
import {IssueBoard} from '@/components/issue-board';
import {IssueDetailDialog} from '@/components/issue-detail-dialog';
import {CreateIssue, GetIdentity, OpenWorkspace, SelectWorkspaceFolder, SetIdentity, TransitionIssueStatus} from '../../wailsjs/go/main/App';
import type {workspace} from '../../wailsjs/go/models';

export function WorkspaceView() {
    const [path, setPath] = useState<string | null>(null);
    const [ws, setWs] = useState<workspace.Workspace | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [identity, setIdentity] = useState<workspace.Identity | null>(null);
    const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
    const [activeProjectKey, setActiveProjectKey] = useState<string | null>(null);
    const [view, setView] = useState<'board' | 'list'>('board');
    const [newIssueOpen, setNewIssueOpen] = useState(false);
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

    async function load(targetPath: string) {
        setLoading(true);
        setError(null);
        try {
            const result = await OpenWorkspace(targetPath);
            setPath(targetPath);
            setWs(result);
            if (!activeProjectKey && result.projects.length > 0) {
                setActiveProjectKey(result.projects[0].key);
            }

            const id = await GetIdentity(targetPath);
            setIdentity(id ?? null);
            if (!id) setIdentityDialogOpen(true);
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }

    async function openWorkspace() {
        const selected = await SelectWorkspaceFolder();
        if (!selected) return; // user cancelled
        await load(selected);
    }

    function patchIssue(updated: workspace.Issue) {
        setWs((prev) => prev && ({
            ...prev,
            issues: prev.issues.some((i) => i.id === updated.id)
                ? prev.issues.map((i) => (i.id === updated.id ? updated : i))
                : [...prev.issues, updated],
        } as workspace.Workspace));
    }

    function patchProject(updated: workspace.Project) {
        setWs((prev) => prev && ({
            ...prev,
            projects: prev.projects.map((p) => (p.key === updated.key ? updated : p)),
        } as workspace.Workspace));
    }

    const toolbar = (
        <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => path && load(path)}
            disabled={loading || !path}
            aria-label="Reload"
        >
            <RotateCw className={loading ? 'animate-spin' : undefined}/>
        </Button>
    );

    // The library-style project switcher lives at the top of the sidebar
    // (see UI Shell & Navigation) — a dropdown, collapsed to the current
    // project. It only makes sense once a workspace with projects is open.
    const sidebarTop = ws && ws.projects.length > 0 && (
        <Select value={activeProjectKey ?? undefined} onValueChange={setActiveProjectKey}>
            <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Project"/>
            </SelectTrigger>
            <SelectContent>
                {ws.projects.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.key} — {p.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    if (!ws) {
        return (
            <AppShell toolbar={toolbar}>
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        {error ?? 'Open a directory containing projects/ or issues/ to get started.'}
                    </p>
                    <Button onClick={openWorkspace} disabled={loading}>
                        {loading ? 'Opening…' : 'Open Workspace'}
                    </Button>
                </div>
            </AppShell>
        );
    }

    const activeProject = ws.projects.find((p) => p.key === activeProjectKey);
    const projectIssues = ws.issues.filter((i) => i.projectKey === activeProjectKey);
    const selectedIssue = ws.issues.find((i) => i.id === selectedIssueId) ?? null;

    return (
        <AppShell sidebarTop={sidebarTop} toolbar={toolbar}>
            <div className="flex flex-col gap-4">
                {ws.warnings.length > 0 && (
                    <div className="rounded-sm border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                            {ws.warnings.length} item{ws.warnings.length === 1 ? '' : 's'} failed to load
                        </p>
                        <ul className="mt-1 list-disc pl-4">
                            {ws.warnings.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {ws.projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No projects yet.</p>
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={view === 'board' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setView('board')}
                                >
                                    Board
                                </Button>
                                <Button
                                    variant={view === 'list' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setView('list')}
                                >
                                    List
                                </Button>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => (identity ? setNewIssueOpen(true) : setIdentityDialogOpen(true))}
                                disabled={!activeProject}
                            >
                                New Issue
                            </Button>
                        </div>

                        {activeProject && view === 'board' && (
                            <IssueBoard
                                project={activeProject}
                                issues={projectIssues}
                                onSelect={setSelectedIssueId}
                                onStatusChange={(id, status) =>
                                    TransitionIssueStatus(path!, id, status).then(patchIssue).catch((err) => setError(String(err)))
                                }
                            />
                        )}
                        {activeProject && view === 'list' && (
                            <IssueList issues={projectIssues} onSelect={setSelectedIssueId}/>
                        )}

                        {activeProject && (
                            <NewIssueDialog
                                open={newIssueOpen}
                                onOpenChange={setNewIssueOpen}
                                project={activeProject}
                                onCreate={async (issueType, title) => {
                                    const issue = await CreateIssue(path!, activeProject.key, issueType, title);
                                    patchIssue(issue);
                                }}
                            />
                        )}
                    </>
                )}

                <IssueDetailDialog
                    path={path ?? ''}
                    issue={selectedIssue}
                    project={ws.projects.find((p) => p.key === selectedIssue?.projectKey)}
                    open={selectedIssueId !== null}
                    onOpenChange={(open) => !open && setSelectedIssueId(null)}
                    onMutate={patchIssue}
                    onProjectMutate={patchProject}
                />

                <IdentitySetupDialog
                    open={identityDialogOpen}
                    onOpenChange={setIdentityDialogOpen}
                    onSubmit={async (name, email) => {
                        await SetIdentity(path!, name, email);
                        setIdentity({name, email} as workspace.Identity);
                    }}
                />
            </div>
        </AppShell>
    );
}
