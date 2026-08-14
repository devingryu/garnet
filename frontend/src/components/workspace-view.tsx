import {useState} from 'react';
import {LayoutGrid, Plus, RotateCw} from 'lucide-react';
import {cn} from '@/lib/utils';
import {AppShell} from '@/components/app-shell';
import {TabBar} from '@/components/tab-bar';
import {tabKey} from '@/lib/tabs';
import type {Tab} from '@/lib/tabs';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {IdentitySetupDialog} from '@/components/identity-setup-dialog';
import {NewIssueDialog} from '@/components/new-issue-dialog';
import {IssueList} from '@/components/issue-list';
import {IssueBoard} from '@/components/issue-board';
import {IssueDetailPanel} from '@/components/issue-detail-panel';
import {DocumentTree} from '@/components/document-tree';
import {DocumentEditorPanel} from '@/components/document-editor-panel';
import {NewDocumentDialog} from '@/components/new-document-dialog';
import {ProjectSettingsDialog} from '@/components/project-settings-dialog';
import type {SettingsSection} from '@/components/project-settings-dialog';
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
    const [newIssueOpen, setNewIssueOpen] = useState(false);
    const [newDocumentOpen, setNewDocumentOpen] = useState(false);
    const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
    const [projectSettingsSection, setProjectSettingsSection] = useState<SettingsSection>('issueTypes');

    // Open tabs, VSCode-style: they persist across project switches, and
    // clicking something already open focuses it instead of duplicating it.
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabKey, setActiveTabKey] = useState<string | null>(null);

    function openTab(tab: Tab) {
        const key = tabKey(tab);
        setTabs((prev) => (prev.some((t) => tabKey(t) === key) ? prev : [...prev, tab]));
        setActiveTabKey(key);
    }

    function closeTab(key: string) {
        setTabs((prev) => {
            const index = prev.findIndex((t) => tabKey(t) === key);
            const next = prev.filter((t) => tabKey(t) !== key);
            if (activeTabKey === key) {
                const neighbor = next[index] ?? next[index - 1] ?? null;
                setActiveTabKey(neighbor ? tabKey(neighbor) : null);
            }
            return next;
        });
    }

    function setIssuesTabView(projectKey: string, view: 'board' | 'list') {
        setTabs((prev) =>
            prev.map((t) => (t.kind === 'issues' && t.projectKey === projectKey ? {...t, view} : t))
        );
    }

    function openIssue(id: string) {
        openTab({kind: 'issue', issueId: id});
    }

    function openDocument(docPath: string) {
        openTab({kind: 'document', docPath});
    }

    async function load(targetPath: string) {
        setLoading(true);
        setError(null);
        try {
            const result = await OpenWorkspace(targetPath);
            setPath(targetPath);
            setWs(result);
            let nextActiveProjectKey = activeProjectKey;
            if (!activeProjectKey && result.projects.length > 0) {
                nextActiveProjectKey = result.projects[0].key;
                setActiveProjectKey(nextActiveProjectKey);
            }
            if (tabs.length === 0 && nextActiveProjectKey) {
                openTab({kind: 'issues', projectKey: nextActiveProjectKey, view: 'board'});
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

    function addDocument(docPath: string) {
        setWs((prev) => prev && ({
            ...prev,
            documents: prev.documents.some((d) => d.path === docPath)
                ? prev.documents
                : [...prev.documents, {path: docPath}],
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
            <SelectTrigger
                size="sm"
                className="w-fit max-w-full justify-start gap-1 rounded-sm border-none bg-transparent p-1 -m-1 text-base font-semibold shadow-none hover:bg-muted data-[size=sm]:h-auto"
            >
                <SelectValue placeholder="Project" className="flex-none truncate"/>
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
    const activeTab = tabs.find((t) => tabKey(t) === activeTabKey) ?? null;
    const activeIssuesTabKey = activeProjectKey ? `issues:${activeProjectKey}` : null;

    // Sidebar's main scrollable body: an Explorer-style "Issues" entry for
    // the active project, then the document tree — replaces the old
    // top-level Board/List/Docs view toggle.
    const sidebarBody = (
        <>
            {activeProject && (
                <button
                    onClick={() => openTab({kind: 'issues', projectKey: activeProject.key, view: 'board'})}
                    className={cn(
                        'flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                        activeTabKey === activeIssuesTabKey
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-foreground/80 hover:bg-muted'
                    )}
                >
                    <LayoutGrid className="size-3.5"/>
                    Issues
                </button>
            )}

            <div className="mt-3 mb-1 flex items-center justify-between px-2">
                <span className="text-xs text-muted-foreground">Documents</span>
                <button
                    onClick={() => setNewDocumentOpen(true)}
                    aria-label="New document"
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <Plus className="size-3.5"/>
                </button>
            </div>
            <DocumentTree documents={ws.documents} onSelect={openDocument}/>
        </>
    );

    const tabBar = tabs.length > 0 && (
        <TabBar
            items={tabs.map((t) => ({
                key: tabKey(t),
                label:
                    t.kind === 'issues'
                        ? (ws.projects.find((p) => p.key === t.projectKey)?.name ?? t.projectKey)
                        : t.kind === 'issue'
                            ? (ws.issues.find((i) => i.id === t.issueId)?.title || t.issueId)
                            : t.docPath,
            }))}
            activeKey={activeTabKey}
            onSelect={setActiveTabKey}
            onClose={closeTab}
        />
    );

    return (
        <AppShell
            sidebarTop={sidebarTop}
            sidebarBody={sidebarBody}
            toolbar={toolbar}
            tabBar={tabBar}
            onSettingsClick={() => {
                if (!activeProject) return;
                setProjectSettingsSection('issueTypes');
                setProjectSettingsOpen(true);
            }}
        >
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

                {!activeTab && (
                    <p className="text-sm text-muted-foreground">
                        Select Issues or a document from the sidebar to get started.
                    </p>
                )}

                {activeTab?.kind === 'issues' && (() => {
                    const project = ws.projects.find((p) => p.key === activeTab.projectKey);
                    if (!project) return null;
                    const projectIssues = ws.issues.filter((i) => i.projectKey === activeTab.projectKey);
                    return (
                        <>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant={activeTab.view === 'board' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setIssuesTabView(project.key, 'board')}
                                    >
                                        Board
                                    </Button>
                                    <Button
                                        variant={activeTab.view === 'list' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setIssuesTabView(project.key, 'list')}
                                    >
                                        List
                                    </Button>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => (identity ? setNewIssueOpen(true) : setIdentityDialogOpen(true))}
                                >
                                    New Issue
                                </Button>
                            </div>

                            {activeTab.view === 'board' ? (
                                <IssueBoard
                                    project={project}
                                    issues={projectIssues}
                                    onSelect={openIssue}
                                    onStatusChange={(id, status) =>
                                        TransitionIssueStatus(path!, id, status).then(patchIssue).catch((err) => setError(String(err)))
                                    }
                                />
                            ) : (
                                <IssueList issues={projectIssues} project={project} onSelect={openIssue}/>
                            )}
                        </>
                    );
                })()}

                {activeTab?.kind === 'issue' && (() => {
                    const issue = ws.issues.find((i) => i.id === activeTab.issueId);
                    if (!issue) return <p className="text-sm text-muted-foreground">Issue not found.</p>;
                    return (
                        <IssueDetailPanel
                            path={path ?? ''}
                            issue={issue}
                            project={ws.projects.find((p) => p.key === issue.projectKey)}
                            ws={ws}
                            onMutate={patchIssue}
                            onOpenDocument={openDocument}
                            onOpenIssue={openIssue}
                            onRequestAddMember={() => {
                                setActiveProjectKey(issue.projectKey);
                                setProjectSettingsSection('members');
                                setProjectSettingsOpen(true);
                            }}
                        />
                    );
                })()}

                {activeTab?.kind === 'document' && (
                    <DocumentEditorPanel
                        path={path ?? ''}
                        docPath={activeTab.docPath}
                        ws={ws}
                        onOpenIssue={openIssue}
                        onOpenDocument={openDocument}
                    />
                )}

                {activeProject && (
                    <NewIssueDialog
                        open={newIssueOpen}
                        onOpenChange={setNewIssueOpen}
                        project={activeProject}
                        onCreate={async (issueType, title) => {
                            const issue = await CreateIssue(path!, activeProject.key, issueType, title);
                            patchIssue(issue);
                            openIssue(issue.id);
                        }}
                    />
                )}

                <NewDocumentDialog
                    path={path ?? ''}
                    open={newDocumentOpen}
                    onOpenChange={setNewDocumentOpen}
                    onCreate={(docPath) => {
                        addDocument(docPath);
                        openDocument(docPath);
                    }}
                />

                <ProjectSettingsDialog
                    path={path ?? ''}
                    project={activeProject}
                    open={projectSettingsOpen}
                    onOpenChange={setProjectSettingsOpen}
                    onMutate={patchProject}
                    initialSection={projectSettingsSection}
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
