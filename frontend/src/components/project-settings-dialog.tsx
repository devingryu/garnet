import {useState} from 'react';
import {X} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {ConfirmDeleteDialog} from '@/components/confirm-delete-dialog';
import {RenameConfirmDialog} from '@/components/rename-confirm-dialog';
import {WorkflowEditor} from '@/components/workflow-editor';
import {useAsyncAction} from '@/lib/use-async-action';
import {
    AddProjectMember,
    AddProjectRepo,
    ArchiveProject,
    CloneProjectRepos,
    CountIssuesByType,
    RemoveProjectRepo,
    RenameIssueType,
    SetProjectIssueTypes,
    SetProjectName,
    UnarchiveProject,
} from '../../wailsjs/go/main/App';
import type {CloneResult, Project, User} from '@/lib/model';

export type SettingsSection = 'general' | 'issueTypes' | 'workflow' | 'repos' | 'members';

const SECTIONS: SettingsSection[] = ['general', 'issueTypes', 'workflow', 'repos', 'members'];

export function ProjectSettingsDialog({
    path,
    project,
    users,
    open,
    onOpenChange,
    onSaved,
    initialSection = 'general',
}: {
    path: string;
    project: Project | undefined;
    /** The workspace's users.yaml registry (GARNET-16/30) — used to
     *  auto-fill a member's name from a matching email, nothing else. */
    users: User[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Re-reads the workspace after a successful write (AGENTS.md rule 2). */
    onSaved: () => void;
    initialSection?: SettingsSection;
}) {
    const {t} = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {project
                            ? t('settings.heading', {project: project.key})
                            : t('app.settings')}
                    </DialogTitle>
                </DialogHeader>

                {project && (
                    // Remounting is what resets the editable copies below — no
                    // effect reassigns them (AGENTS.md rule 6). Keying on `open`
                    // too means every reopen starts from what is on disk.
                    <SettingsForm
                        key={`${project.key}:${initialSection}:${String(open)}`}
                        path={path}
                        project={project}
                        users={users}
                        initialSection={initialSection}
                        onSaved={onSaved}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function SettingsForm({
    path,
    project,
    users,
    initialSection,
    onSaved,
}: {
    path: string;
    project: Project;
    users: User[];
    initialSection: SettingsSection;
    onSaved: () => void;
}) {
    const {t} = useTranslation();
    const {run, error} = useAsyncAction();

    const [section, setSection] = useState<SettingsSection>(initialSection);
    const [name, setName] = useState(project.name);
    const [newRepoUrl, setNewRepoUrl] = useState('');
    const [newRepoPath, setNewRepoPath] = useState('');
    const [cloning, setCloning] = useState(false);
    const [cloneResult, setCloneResult] = useState<CloneResult | null>(null);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');

    /** Runs a write, then asks the parent to re-read the workspace. */
    async function save(action: () => Promise<unknown>): Promise<boolean> {
        const result = await run(action);
        if (result.ok) onSaved();
        return result.ok;
    }

    async function cloneRepos() {
        setCloning(true);
        setCloneResult(null);
        const result = await run(() => CloneProjectRepos(path, project.key));
        if (result.ok) {
            setCloneResult(result.value);
            onSaved();
        }
        setCloning(false);
    }

    function onMemberEmailChange(email: string) {
        setNewMemberEmail(email);
        // A matching users.yaml entry auto-fills the name, still editable,
        // still a separate write from AddProjectMember — GARNET-26's light
        // tie-in between the workspace's People registry and this
        // project's own closed membership list (ADR 0009).
        if (!newMemberName.trim()) {
            const match = users.find((u) => u.email === email.trim());
            if (match) setNewMemberName(match.name);
        }
    }

    return (
        <div className="flex gap-4">
            <div className="flex w-32 shrink-0 flex-col gap-0.5 border-r border-border pr-2">
                {SECTIONS.map((key) => (
                    <button
                        key={key}
                        onClick={() => setSection(key)}
                        className={cn(
                            'rounded-sm px-2 py-1.5 text-left text-sm',
                            section === key
                                ? 'bg-accent font-medium text-accent-foreground'
                                : 'text-foreground/80 hover:bg-muted'
                        )}
                    >
                        {t(`settings.sections.${key}`)}
                    </button>
                ))}
            </div>

            <div className="flex max-h-[60vh] flex-1 flex-col gap-3 overflow-y-auto">
                {section === 'general' && (
                    <GeneralSection
                        path={path}
                        project={project}
                        name={name}
                        setName={setName}
                        onSaved={onSaved}
                        run={run}
                    />
                )}

                {section === 'issueTypes' && (
                    <IssueTypesSection path={path} project={project} onSaved={onSaved} />
                )}

                {section === 'workflow' && (
                    <WorkflowEditor path={path} project={project} onSaved={onSaved} />
                )}

                {section === 'repos' && (
                    <>
                        <div className="flex flex-col gap-1">
                            {project.repos.map((repo) => (
                                <div
                                    key={repo.path}
                                    className="flex items-center justify-between gap-2 text-sm"
                                >
                                    <span className="truncate">
                                        {repo.path} — {repo.url}
                                    </span>
                                    <button
                                        onClick={() =>
                                            void save(() =>
                                                RemoveProjectRepo(path, project.key, repo.path)
                                            )
                                        }
                                        aria-label={t('common.remove', {name: repo.path})}
                                    >
                                        <X className="size-3.5 text-muted-foreground" />
                                    </button>
                                </div>
                            ))}
                            {project.repos.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {t('settings.noRepos')}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <Input
                                placeholder={t('settings.repoUrl')}
                                value={newRepoUrl}
                                onChange={(e) => setNewRepoUrl(e.target.value)}
                            />
                            <Input
                                placeholder={t('settings.repoPath')}
                                value={newRepoPath}
                                onChange={(e) => setNewRepoPath(e.target.value)}
                                className="w-32"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!newRepoUrl.trim() || !newRepoPath.trim()}
                                onClick={() => {
                                    void save(
                                        () =>
                                            AddProjectRepo(
                                                path,
                                                project.key,
                                                newRepoUrl.trim(),
                                                newRepoPath.trim()
                                            )
                                        // Only clear the fields once the write
                                        // landed, so a rejected URL can be fixed
                                        // rather than retyped.
                                    ).then((ok) => {
                                        if (!ok) return;
                                        setNewRepoUrl('');
                                        setNewRepoPath('');
                                    });
                                }}
                            >
                                {t('common.add')}
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={cloning || project.repos.length === 0}
                            onClick={() => void cloneRepos()}
                        >
                            {cloning ? t('settings.cloning') : t('settings.clone')}
                        </Button>
                        {cloneResult && (
                            <div className="text-sm">
                                {cloneResult.cloned.length > 0 && (
                                    <p className="text-muted-foreground">
                                        {t('settings.cloned', {
                                            paths: cloneResult.cloned.join(', '),
                                        })}
                                    </p>
                                )}
                                {cloneResult.warnings.map((warning) => (
                                    <p key={warning} className="text-destructive">
                                        {warning}
                                    </p>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {section === 'members' && (
                    <>
                        <div className="flex flex-col gap-1">
                            {project.members.map((m) => (
                                <p key={m.email} className="text-sm">
                                    {m.name}{' '}
                                    <span className="text-muted-foreground">({m.email})</span>
                                </p>
                            ))}
                            {project.members.length === 0 && (
                                <p className="text-sm text-muted-foreground">{t('member.none')}</p>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <Input
                                placeholder={t('member.name')}
                                value={newMemberName}
                                onChange={(e) => setNewMemberName(e.target.value)}
                            />
                            <Input
                                placeholder={t('member.email')}
                                value={newMemberEmail}
                                onChange={(e) => onMemberEmailChange(e.target.value)}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!newMemberName.trim() || !newMemberEmail.trim()}
                                onClick={() => {
                                    void save(() =>
                                        AddProjectMember(
                                            path,
                                            project.key,
                                            newMemberName.trim(),
                                            newMemberEmail.trim()
                                        )
                                    ).then((ok) => {
                                        if (!ok) return;
                                        setNewMemberName('');
                                        setNewMemberEmail('');
                                    });
                                }}
                            >
                                {t('common.add')}
                            </Button>
                        </div>
                    </>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        </div>
    );
}

function GeneralSection({
    path,
    project,
    name,
    setName,
    onSaved,
    run,
}: {
    path: string;
    project: Project;
    name: string;
    setName: (name: string) => void;
    onSaved: () => void;
    run: ReturnType<typeof useAsyncAction>['run'];
}) {
    const {t} = useTranslation();

    return (
        <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">{t('settings.projectName')}</span>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => {
                        if (!name.trim() || name === project.name) return;
                        void run(() => SetProjectName(path, project.key, name.trim())).then(
                            (result) => {
                                if (result.ok) onSaved();
                            }
                        );
                    }}
                />
            </label>

            <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-muted-foreground">{t('settings.projectKey')}</span>
                <Input value={project.key} disabled className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                    {t('settings.projectKeyHint')}
                </span>
            </label>

            <div className="border-t border-border pt-3">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() =>
                        void run(() =>
                            project.archived
                                ? UnarchiveProject(path, project.key)
                                : ArchiveProject(path, project.key)
                        ).then((result) => {
                            if (result.ok) onSaved();
                        })
                    }
                >
                    {project.archived
                        ? t('settings.unarchiveProject')
                        : t('settings.archiveProject')}
                </Button>
            </div>
        </div>
    );
}

interface TypeDraft {
    key: string;
    originalType: string;
    type: string;
}

function draftsFrom(project: Project): TypeDraft[] {
    return project.issueTypes.map((type, i) => ({key: `${type}:${i}`, originalType: type, type}));
}

function IssueTypesSection({
    path,
    project,
    onSaved,
}: {
    path: string;
    project: Project;
    onSaved: () => void;
}) {
    const {t} = useTranslation();
    const {run, error, setError} = useAsyncAction();
    const [types, setTypes] = useState<TypeDraft[]>(() => draftsFrom(project));
    const [newType, setNewType] = useState('');
    const [renamePrompt, setRenamePrompt] = useState<{
        rowKey: string;
        oldType: string;
        newType: string;
        count: number;
    } | null>(null);
    const [renaming, setRenaming] = useState(false);
    const [deletePrompt, setDeletePrompt] = useState<{rowKey: string; count: number} | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function persist(next: TypeDraft[]) {
        const values = next.map((t) => t.type.trim()).filter(Boolean);
        const dup = values.find((v, i) => values.indexOf(v) !== i);
        if (dup) {
            setError(t('settings.workflow.duplicateId', {id: dup}));
            return false;
        }
        const result = await run(() => SetProjectIssueTypes(path, project.key, values));
        if (result.ok) onSaved();
        return result.ok;
    }

    function updateType(key: string, value: string) {
        setTypes((prev) => prev.map((row) => (row.key === key ? {...row, type: value} : row)));
    }

    async function commitType(row: TypeDraft) {
        const value = row.type.trim();
        if (!row.originalType) {
            void persist(types); // a fresh chip — plain save, not a rename
            return;
        }
        if (value === row.originalType) return;
        if (!value) {
            setError(t('settings.workflow.idRequired'));
            return;
        }
        if (types.some((r) => r.key !== row.key && r.type.trim() === value)) {
            setError(t('settings.workflow.duplicateId', {id: value}));
            return;
        }
        const result = await run(() => CountIssuesByType(path, project.key, row.originalType));
        if (!result.ok) return;
        setRenamePrompt({
            rowKey: row.key,
            oldType: row.originalType,
            newType: value,
            count: result.value,
        });
    }

    async function confirmRename() {
        if (!renamePrompt) return;
        setRenaming(true);
        const result = await run(() =>
            RenameIssueType(path, project.key, renamePrompt.oldType, renamePrompt.newType)
        );
        setRenaming(false);
        if (!result.ok) return;
        setTypes((prev) =>
            prev.map((row) =>
                row.key === renamePrompt.rowKey ? {...row, originalType: renamePrompt.newType} : row
            )
        );
        setRenamePrompt(null);
        onSaved();
    }

    function cancelRename() {
        if (!renamePrompt) return;
        setTypes((prev) =>
            prev.map((row) =>
                row.key === renamePrompt.rowKey ? {...row, type: renamePrompt.oldType} : row
            )
        );
        setRenamePrompt(null);
    }

    async function removeType(row: TypeDraft) {
        const result = await run(() => CountIssuesByType(path, project.key, row.originalType));
        if (!result.ok) return;
        if (result.value > 0) {
            setDeletePrompt({rowKey: row.key, count: result.value});
            return;
        }
        await doRemove(row.key);
    }

    async function doRemove(rowKey: string) {
        const next = types.filter((row) => row.key !== rowKey);
        const ok = await persist(next);
        if (ok) setTypes(next);
    }

    function addType() {
        const value = newType.trim();
        if (!value || types.some((row) => row.type === value)) return;
        const next = [...types, {key: `new:${types.length}`, originalType: value, type: value}];
        setTypes(next);
        setNewType('');
        void persist(next);
    }

    return (
        <>
            <div className="flex flex-col gap-1">
                {types.map((row) => (
                    <div key={row.key} className="flex items-center gap-1.5">
                        <Input
                            value={row.type}
                            onChange={(e) => updateType(row.key, e.target.value)}
                            onBlur={() => void commitType(row)}
                            className="h-7 w-40"
                        />
                        <button
                            onClick={() => void removeType(row)}
                            aria-label={t('settings.removeIssueType', {type: row.type})}
                        >
                            <X className="size-3 text-muted-foreground" />
                        </button>
                    </div>
                ))}
                {types.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('settings.noIssueTypes')}</p>
                )}
            </div>
            <div className="flex gap-1.5">
                <Input
                    placeholder={t('settings.newIssueType')}
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addType()}
                />
                <Button variant="outline" size="sm" disabled={!newType.trim()} onClick={addType}>
                    {t('common.add')}
                </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}

            <RenameConfirmDialog
                open={renamePrompt !== null}
                onOpenChange={(o) => !o && cancelRename()}
                count={renamePrompt?.count ?? 0}
                pending={renaming}
                onConfirm={() => void confirmRename()}
            />
            <ConfirmDeleteDialog
                open={deletePrompt !== null}
                onOpenChange={(o) => !o && setDeletePrompt(null)}
                title={t('settings.workflow.deleteTitle')}
                description={t('settings.workflow.deleteBody', {count: deletePrompt?.count ?? 0})}
                pending={deleting}
                onConfirm={() => {
                    if (!deletePrompt) return;
                    setDeleting(true);
                    void doRemove(deletePrompt.rowKey).then(() => {
                        setDeleting(false);
                        setDeletePrompt(null);
                    });
                }}
            />
        </>
    );
}
