import {useState} from 'react';
import {X} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {useAsyncAction} from '@/lib/use-async-action';
import {
    AddProjectMember,
    AddProjectRepo,
    ArchiveProject,
    CloneProjectRepos,
    RemoveProjectRepo,
    SetProjectIssueTypes,
    SetWorkflow,
    UnarchiveProject,
} from '../../wailsjs/go/main/App';
import type {CloneResult, Project, Status, Transition, Workflow} from '@/lib/model';

export type SettingsSection = 'issueTypes' | 'workflow' | 'repos' | 'members' | 'archive';

const SECTIONS: SettingsSection[] = ['issueTypes', 'workflow', 'repos', 'members', 'archive'];

// Editable copy of a project's workflow — statuses plus a comma-separated
// "can move to" field per status, parsed into Transition[] on save.
interface WorkflowRow {
    id: string;
    name: string;
    category: string;
    to: string;
}

function toRows(workflow: Workflow | undefined | null): WorkflowRow[] {
    if (!workflow) return [];
    return workflow.statuses.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        to: (workflow.transitions.find((t) => t.from === s.id)?.to ?? []).join(', '),
    }));
}

export function ProjectSettingsDialog({
    path,
    project,
    open,
    onOpenChange,
    onSaved,
    initialSection = 'issueTypes',
}: {
    path: string;
    project: Project | undefined;
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
    initialSection,
    onSaved,
}: {
    path: string;
    project: Project;
    initialSection: SettingsSection;
    onSaved: () => void;
}) {
    const {t} = useTranslation();
    const {run, error} = useAsyncAction();

    const [section, setSection] = useState<SettingsSection>(initialSection);
    const [issueTypes, setIssueTypes] = useState<string[]>(project.issueTypes);
    const [newType, setNewType] = useState('');
    const [rows, setRows] = useState<WorkflowRow[]>(() => toRows(project.workflow));
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

    function addIssueType() {
        const type = newType.trim();
        if (!type || issueTypes.includes(type)) return;
        const next = [...issueTypes, type];
        setIssueTypes(next);
        setNewType('');
        void save(() => SetProjectIssueTypes(path, project.key, next));
    }

    function removeIssueType(type: string) {
        const next = issueTypes.filter((x) => x !== type);
        setIssueTypes(next);
        void save(() => SetProjectIssueTypes(path, project.key, next));
    }

    function saveWorkflow() {
        const statuses: Status[] = rows
            .filter((r) => r.id.trim())
            .map((r) => ({
                id: r.id.trim(),
                name: r.name.trim() || r.id.trim(),
                category: r.category.trim(),
            }));
        const transitions: Transition[] = rows
            .filter((r) => r.id.trim() && r.to.trim())
            .map((r) => ({
                from: r.id.trim(),
                to: r.to
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
            }));
        void save(() => SetWorkflow(path, project.key, statuses, transitions));
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
                {section === 'issueTypes' && (
                    <>
                        <div className="flex flex-wrap gap-1.5">
                            {issueTypes.map((type) => (
                                <span
                                    key={type}
                                    className="flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-sm"
                                >
                                    {type}
                                    <button
                                        onClick={() => removeIssueType(type)}
                                        aria-label={t('common.remove', {name: type})}
                                    >
                                        <X className="size-3 text-muted-foreground" />
                                    </button>
                                </span>
                            ))}
                            {issueTypes.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {t('settings.noIssueTypes')}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <Input
                                placeholder={t('settings.newIssueType')}
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addIssueType()}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!newType.trim()}
                                onClick={addIssueType}
                            >
                                {t('common.add')}
                            </Button>
                        </div>
                    </>
                )}

                {section === 'workflow' && (
                    <>
                        <div className="flex flex-col gap-1.5">
                            {rows.map((row, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <Input
                                        placeholder={t('settings.statusId')}
                                        value={row.id}
                                        onChange={(e) =>
                                            setRows(
                                                rows.map((r, idx) =>
                                                    idx === i ? {...r, id: e.target.value} : r
                                                )
                                            )
                                        }
                                        className="w-20"
                                    />
                                    <Input
                                        placeholder={t('settings.statusName')}
                                        value={row.name}
                                        onChange={(e) =>
                                            setRows(
                                                rows.map((r, idx) =>
                                                    idx === i ? {...r, name: e.target.value} : r
                                                )
                                            )
                                        }
                                        className="w-24"
                                    />
                                    <Input
                                        placeholder={t('settings.statusCategory')}
                                        value={row.category}
                                        onChange={(e) =>
                                            setRows(
                                                rows.map((r, idx) =>
                                                    idx === i ? {...r, category: e.target.value} : r
                                                )
                                            )
                                        }
                                        className="w-24"
                                    />
                                    <Input
                                        placeholder={t('settings.statusTargets')}
                                        value={row.to}
                                        onChange={(e) =>
                                            setRows(
                                                rows.map((r, idx) =>
                                                    idx === i ? {...r, to: e.target.value} : r
                                                )
                                            )
                                        }
                                        className="flex-1"
                                    />
                                    <button
                                        onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                                        aria-label={t('settings.removeStatus')}
                                    >
                                        <X className="size-3.5 text-muted-foreground" />
                                    </button>
                                </div>
                            ))}
                            {rows.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {t('settings.noWorkflow')}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setRows([...rows, {id: '', name: '', category: '', to: ''}])
                                }
                            >
                                {t('settings.addStatus')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={saveWorkflow}>
                                {t('settings.saveWorkflow')}
                            </Button>
                        </div>
                    </>
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
                                onChange={(e) => setNewMemberEmail(e.target.value)}
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

                {section === 'archive' && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={() =>
                            void save(() =>
                                project.archived
                                    ? UnarchiveProject(path, project.key)
                                    : ArchiveProject(path, project.key)
                            )
                        }
                    >
                        {project.archived
                            ? t('settings.unarchiveProject')
                            : t('settings.archiveProject')}
                    </Button>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        </div>
    );
}
