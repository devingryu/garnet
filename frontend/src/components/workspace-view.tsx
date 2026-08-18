import {useEffect, useState} from 'react';
import {GitBranch, LayoutGrid, Plus, RotateCw} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '@/lib/utils';
import {AppShell} from '@/components/app-shell';
import {TabBar} from '@/components/tab-bar';
import {closeTab, nextActiveKey, openTab, setIssuesView, tabKey} from '@/lib/tabs';
import type {IssuesView, Tab} from '@/lib/tabs';
import {Button} from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {IdentitySetupDialog} from '@/components/identity-setup-dialog';
import {NewIssueDialog} from '@/components/new-issue-dialog';
import {NewProjectDialog} from '@/components/new-project-dialog';
import {IssueList} from '@/components/issue-list';
import {IssueBoard} from '@/components/issue-board';
import {IssueDetailPanel} from '@/components/issue-detail-panel';
import {DocumentTree} from '@/components/document-tree';
import {DocumentEditorPanel} from '@/components/document-editor-panel';
import {NewDocumentDialog} from '@/components/new-document-dialog';
import {GitPanel} from '@/components/git-panel';
import {ProjectSettingsDialog} from '@/components/project-settings-dialog';
import type {SettingsSection} from '@/components/project-settings-dialog';
import {backlinksFor} from '@/lib/documents';
import {useWorkspace} from '@/lib/use-workspace';
import {
    GetIdentity,
    RecentWorkspaces,
    RecordRecentWorkspace,
    SelectWorkspaceFolder,
    TransitionIssueStatus,
    WriteDocument,
} from '../../wailsjs/go/main/App';
import type {Identity, RecentWorkspace} from '@/lib/model';

/** The last path segment, for the bold line of a recent-workspace entry —
 *  handles both POSIX and Windows separators since either could show up in
 *  a stored path. */
function baseName(path: string): string {
    const parts = path.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] ?? path;
}

export function WorkspaceView() {
    const {t} = useTranslation();
    const {loaded, load, reload, mutate, run, error, pending} = useWorkspace();

    const [identity, setIdentity] = useState<Identity | null>(null);
    const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
    const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
    const [newIssueOpen, setNewIssueOpen] = useState(false);
    const [newDocumentOpen, setNewDocumentOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsSection, setSettingsSection] = useState<SettingsSection>('issueTypes');
    const [newProjectOpen, setNewProjectOpen] = useState(false);
    const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>([]);

    // Fetched once, when the view first mounts — GARNET-24. A fresh list
    // would only matter after opening another workspace, which reloads this
    // same component tree rather than re-mounting it, so there's no later
    // point where re-fetching would show something new.
    useEffect(() => {
        void run(() => RecentWorkspaces()).then((result) => {
            if (result.ok) setRecentWorkspaces(result.value);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Open tabs, VSCode-style: they persist across project switches, and
    // clicking something already open focuses it instead of duplicating it.
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabKey, setActiveTabKey] = useState<string | null>(null);

    function focusTab(tab: Tab) {
        setTabs((prev) => openTab(prev, tab));
        setActiveTabKey(tabKey(tab));
    }

    function handleCloseTab(key: string) {
        setActiveTabKey((active) => nextActiveKey(tabs, key, active));
        setTabs((prev) => closeTab(prev, key));
    }

    function openIssue(issueId: string) {
        focusTab({kind: 'issue', issueId});
    }

    function openDocument(docPath: string) {
        focusTab({kind: 'document', docPath});
    }

    function openSettings(section: SettingsSection) {
        setSettingsSection(section);
        setSettingsOpen(true);
    }

    /** Opens path and records it as recently-used. Shared by the native
     *  folder dialog and by clicking a recent-workspace entry (GARNET-24) —
     *  from here on the two flows are identical. */
    async function openWorkspaceAt(selectedPath: string) {
        const data = await load(selectedPath);
        if (!data) return;
        const firstProject = data.projects[0];
        if (firstProject && tabs.length === 0) {
            focusTab({kind: 'issues', projectKey: firstProject.key, view: 'board'});
        }

        const found = await run(() => GetIdentity(selectedPath));
        if (found.ok) {
            setIdentity(found.value ?? null);
            if (!found.value) setIdentityDialogOpen(true);
        }

        // Best-effort: a real user chose to open this workspace, so it's
        // recent now, but a failure to record that shouldn't surface as an
        // error — the open itself already succeeded.
        void RecordRecentWorkspace(selectedPath);
    }

    async function openWorkspace() {
        const picked = await run(() => SelectWorkspaceFolder(t('workspace.chooseFolder')));
        // "" means the user dismissed the native dialog — not a failure.
        if (!picked.ok || !picked.value) return;
        await openWorkspaceAt(picked.value);
    }

    const toolbar = (
        <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void reload()}
            disabled={pending || !loaded}
            aria-label={t('app.reload')}
        >
            <RotateCw className={pending ? 'animate-spin' : undefined} />
        </Button>
    );

    if (!loaded) {
        return (
            <AppShell toolbar={toolbar}>
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        {error ?? t('workspace.openPrompt')}
                    </p>
                    <Button onClick={() => void openWorkspace()} disabled={pending}>
                        {pending ? t('workspace.opening') : t('workspace.open')}
                    </Button>

                    {recentWorkspaces.length > 0 && (
                        <div className="mt-4 flex w-full max-w-sm flex-col gap-1">
                            <span className="text-xs text-muted-foreground">
                                {t('workspace.recent')}
                            </span>
                            {recentWorkspaces.map((recent) => (
                                <button
                                    key={recent.path}
                                    onClick={() => void openWorkspaceAt(recent.path)}
                                    disabled={pending}
                                    title={recent.path}
                                    className="flex flex-col items-start rounded-sm border border-border px-3 py-2 text-left hover:bg-muted"
                                >
                                    <span className="text-sm font-medium">
                                        {baseName(recent.path)}
                                    </span>
                                    <span className="w-full truncate text-xs text-muted-foreground">
                                        {recent.path}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </AppShell>
        );
    }

    const {path, data: ws} = loaded;
    // Not stored as a default on load: the selected project, falling back to
    // the first one, is derived on every render instead.
    const activeProject = ws.projects.find((p) => p.key === selectedProjectKey) ?? ws.projects[0];
    const activeTab = tabs.find((tab) => tabKey(tab) === activeTabKey) ?? null;

    // The library-style project switcher lives at the top of the sidebar
    // (see UI Shell & Navigation) — a dropdown, collapsed to the current
    // project. The "+" next to it always renders, even with zero projects —
    // that's the bootstrap case GARNET-3 exists for: a workspace with no
    // projects yet still needs a way to create the first one in-app.
    const projectItems = ws.projects.map((p) => ({value: p.key, label: `${p.key} — ${p.name}`}));
    const sidebarTop = (
        <div className="flex items-center gap-1">
            {ws.projects.length > 0 && (
                <Select
                    items={projectItems}
                    value={activeProject?.key}
                    onValueChange={(v) => v != null && setSelectedProjectKey(String(v))}
                >
                    <SelectTrigger
                        size="sm"
                        className="w-fit max-w-full flex-1 justify-start gap-1 rounded-sm border-none bg-transparent p-1 -m-1 text-base font-semibold shadow-none hover:bg-muted data-[size=sm]:h-auto"
                    >
                        <SelectValue
                            placeholder={t('workspace.projectPlaceholder')}
                            className="flex-none truncate"
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Project keys and names are workspace data (AGENTS.md rule 11). */}
                        {projectItems.map((item) => (
                            <SelectItem key={item.value} value={item.value} label={item.label}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            <button
                onClick={() => setNewProjectOpen(true)}
                aria-label={t('project.new')}
                className="shrink-0 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
                <Plus className="size-3.5" />
            </button>
        </div>
    );

    // Sidebar's main scrollable body: an Explorer-style "Issues" entry for
    // the active project, then the document tree.
    const sidebarBody = (
        <>
            {activeProject && (
                <button
                    onClick={() =>
                        focusTab({kind: 'issues', projectKey: activeProject.key, view: 'board'})
                    }
                    className={cn(
                        'flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                        activeTabKey === `issues:${activeProject.key}`
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-foreground/80 hover:bg-muted'
                    )}
                >
                    <LayoutGrid className="size-3.5" />
                    {t('sidebar.issues')}
                </button>
            )}

            <button
                onClick={() => focusTab({kind: 'git'})}
                className={cn(
                    'flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                    activeTabKey === 'git'
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-foreground/80 hover:bg-muted'
                )}
            >
                <GitBranch className="size-3.5" />
                {t('sidebar.git')}
            </button>

            <div className="mt-3 mb-1 flex items-center justify-between px-2">
                <span className="text-xs text-muted-foreground">{t('sidebar.documents')}</span>
                <button
                    onClick={() => setNewDocumentOpen(true)}
                    aria-label={t('sidebar.newDocument')}
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <Plus className="size-3.5" />
                </button>
            </div>
            <DocumentTree documents={ws.documents} onSelect={openDocument} />
        </>
    );

    const tabBar = tabs.length > 0 && (
        <TabBar
            items={tabs.map((tab) => ({
                key: tabKey(tab),
                label:
                    tab.kind === 'issues'
                        ? (ws.projects.find((p) => p.key === tab.projectKey)?.name ??
                          tab.projectKey)
                        : tab.kind === 'issue'
                          ? ws.issues.find((i) => i.id === tab.issueId)?.title || tab.issueId
                          : tab.kind === 'document'
                            ? tab.docPath
                            : t('sidebar.git'),
            }))}
            activeKey={activeTabKey}
            onSelect={setActiveTabKey}
            onClose={handleCloseTab}
        />
    );

    const issuesTab = activeTab?.kind === 'issues' ? activeTab : null;
    const issuesTabProject = issuesTab
        ? ws.projects.find((p) => p.key === issuesTab.projectKey)
        : undefined;
    const issueTab = activeTab?.kind === 'issue' ? activeTab : null;
    const openedIssue = issueTab ? ws.issues.find((i) => i.id === issueTab.issueId) : undefined;
    const documentTab = activeTab?.kind === 'document' ? activeTab : null;

    function changeIssuesView(projectKey: string, view: IssuesView) {
        setTabs((prev) => setIssuesView(prev, projectKey, view));
    }

    return (
        <AppShell
            sidebarTop={sidebarTop}
            sidebarBody={sidebarBody}
            toolbar={toolbar}
            tabBar={tabBar}
            onSettingsClick={() => activeProject && openSettings('issueTypes')}
        >
            <div className="flex flex-col gap-4">
                {error && <p className="text-sm text-destructive">{error}</p>}

                {ws.warnings.length > 0 && (
                    <div className="rounded-sm border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                            {t('workspace.loadFailures', {count: ws.warnings.length})}
                        </p>
                        <ul className="mt-1 list-disc pl-4">
                            {ws.warnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {!activeTab && (
                    <p className="text-sm text-muted-foreground">
                        {t('workspace.nothingSelected')}
                    </p>
                )}

                {issuesTab && issuesTabProject && (
                    <>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={issuesTab.view === 'board' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => changeIssuesView(issuesTabProject.key, 'board')}
                                >
                                    {t('issues.board')}
                                </Button>
                                <Button
                                    variant={issuesTab.view === 'list' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => changeIssuesView(issuesTabProject.key, 'list')}
                                >
                                    {t('issues.list')}
                                </Button>
                            </div>
                            <Button
                                size="sm"
                                onClick={() =>
                                    identity ? setNewIssueOpen(true) : setIdentityDialogOpen(true)
                                }
                            >
                                {t('issues.new')}
                            </Button>
                        </div>

                        {issuesTab.view === 'board' ? (
                            <IssueBoard
                                project={issuesTabProject}
                                issues={ws.issues.filter(
                                    (i) => i.projectKey === issuesTabProject.key
                                )}
                                onSelect={openIssue}
                                onStatusChange={(id, status) =>
                                    void mutate((p) => TransitionIssueStatus(p, id, status))
                                }
                            />
                        ) : (
                            <IssueList
                                issues={ws.issues.filter(
                                    (i) => i.projectKey === issuesTabProject.key
                                )}
                                project={issuesTabProject}
                                onSelect={openIssue}
                            />
                        )}
                    </>
                )}

                {issueTab &&
                    (openedIssue ? (
                        <IssueDetailPanel
                            key={openedIssue.id}
                            issue={openedIssue}
                            issues={ws.issues}
                            project={ws.projects.find((p) => p.key === openedIssue.projectKey)}
                            referencedBy={backlinksFor(ws, 'issue', openedIssue.id)}
                            mutate={mutate}
                            onOpenDocument={openDocument}
                            onOpenIssue={openIssue}
                            onRequestAddMember={() => {
                                setSelectedProjectKey(openedIssue.projectKey);
                                openSettings('members');
                            }}
                            onDeleted={() => handleCloseTab(tabKey(issueTab))}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('issues.notFound')}</p>
                    ))}

                {documentTab && (
                    <DocumentEditorPanel
                        key={documentTab.docPath}
                        path={path}
                        docPath={documentTab.docPath}
                        referencedBy={backlinksFor(ws, 'document', documentTab.docPath)}
                        onSave={(content) =>
                            mutate((p) => WriteDocument(p, documentTab.docPath, content))
                        }
                        onOpenIssue={openIssue}
                        onOpenDocument={openDocument}
                        onDeleted={() => handleCloseTab(tabKey(documentTab))}
                    />
                )}

                {activeTab?.kind === 'git' && <GitPanel key={path} path={path} />}

                {activeProject && (
                    <NewIssueDialog
                        path={path}
                        open={newIssueOpen}
                        onOpenChange={setNewIssueOpen}
                        project={activeProject}
                        onCreated={(issueId) => {
                            void reload();
                            openIssue(issueId);
                        }}
                    />
                )}

                <NewDocumentDialog
                    path={path}
                    open={newDocumentOpen}
                    onOpenChange={setNewDocumentOpen}
                    onCreated={(docPath) => {
                        void reload();
                        openDocument(docPath);
                    }}
                />

                <NewProjectDialog
                    path={path}
                    open={newProjectOpen}
                    onOpenChange={setNewProjectOpen}
                    onCreated={(projectKey) => {
                        void reload();
                        setSelectedProjectKey(projectKey);
                    }}
                />

                <ProjectSettingsDialog
                    path={path}
                    project={activeProject}
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    onSaved={() => void reload()}
                    initialSection={settingsSection}
                />

                <IdentitySetupDialog
                    path={path}
                    open={identityDialogOpen}
                    onOpenChange={setIdentityDialogOpen}
                    onSaved={setIdentity}
                />
            </div>
        </AppShell>
    );
}
