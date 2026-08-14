import {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import type {workspace} from '../../wailsjs/go/models';

export type SettingsSection = 'issueTypes' | 'workflow' | 'repos' | 'members' | 'archive';

const SECTIONS: {key: SettingsSection; label: string}[] = [
    {key: 'issueTypes', label: 'Issue types'},
    {key: 'workflow', label: 'Workflow'},
    {key: 'repos', label: 'Repos'},
    {key: 'members', label: 'Members'},
    {key: 'archive', label: 'Archive'},
];

// Editable copy of a project's workflow — statuses plus a comma-separated
// "can move to" field per status, parsed into Transition[] on save.
type WorkflowRow = {id: string; name: string; category: string; to: string};

function toRows(workflow: workspace.Workflow | undefined): WorkflowRow[] {
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
    onMutate,
    initialSection,
}: {
    path: string;
    project: workspace.Project | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMutate: (updated: workspace.Project) => void;
    initialSection?: SettingsSection;
}) {
    const [section, setSection] = useState<SettingsSection>('issueTypes');
    const [issueTypes, setIssueTypes] = useState<string[]>([]);
    const [newType, setNewType] = useState('');
    const [rows, setRows] = useState<WorkflowRow[]>([]);
    const [newRepoUrl, setNewRepoUrl] = useState('');
    const [newRepoPath, setNewRepoPath] = useState('');
    const [cloning, setCloning] = useState(false);
    const [cloneResult, setCloneResult] = useState<workspace.CloneResult | null>(null);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIssueTypes(project?.issueTypes ?? []);
        setRows(toRows(project?.workflow));
        setCloneResult(null);
        setError(null);
    }, [project?.key]);

    useEffect(() => {
        if (open) setSection(initialSection ?? 'issueTypes');
    }, [open, initialSection]);

    if (!project) return null;
    const proj = project;

    async function run(action: () => Promise<workspace.Project>) {
        setError(null);
        try {
            onMutate(await action());
        } catch (err) {
            setError(String(err));
        }
    }

    function addIssueType() {
        const t = newType.trim();
        if (!t || issueTypes.includes(t)) return;
        const next = [...issueTypes, t];
        setIssueTypes(next);
        setNewType('');
        run(() => SetProjectIssueTypes(path, proj.key, next));
    }

    function removeIssueType(t: string) {
        const next = issueTypes.filter((x) => x !== t);
        setIssueTypes(next);
        run(() => SetProjectIssueTypes(path, proj.key, next));
    }

    function addWorkflowRow() {
        setRows([...rows, {id: '', name: '', category: '', to: ''}]);
    }

    function removeWorkflowRow(i: number) {
        setRows(rows.filter((_, idx) => idx !== i));
    }

    function updateRow(i: number, patch: Partial<WorkflowRow>) {
        setRows(rows.map((r, idx) => (idx === i ? {...r, ...patch} : r)));
    }

    function saveWorkflow() {
        const statuses = rows
            .filter((r) => r.id.trim())
            .map((r) => ({id: r.id.trim(), name: r.name.trim() || r.id.trim(), category: r.category.trim()}));
        const transitions = rows
            .filter((r) => r.id.trim() && r.to.trim())
            .map((r) => ({
                from: r.id.trim(),
                to: r.to.split(',').map((s) => s.trim()).filter(Boolean),
            }));
        run(() => SetWorkflow(path, proj.key, statuses as workspace.Status[], transitions as workspace.Transition[]));
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{project.key} settings</DialogTitle>
                </DialogHeader>

                <div className="flex gap-4">
                    <div className="flex w-32 shrink-0 flex-col gap-0.5 border-r border-border pr-2">
                        {SECTIONS.map((s) => (
                            <button
                                key={s.key}
                                onClick={() => setSection(s.key)}
                                className={cn(
                                    'rounded-sm px-2 py-1.5 text-left text-sm',
                                    section === s.key
                                        ? 'bg-accent font-medium text-accent-foreground'
                                        : 'text-foreground/80 hover:bg-muted'
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex max-h-[60vh] flex-1 flex-col gap-3 overflow-y-auto">
                        {section === 'issueTypes' && (
                            <>
                                <div className="flex flex-wrap gap-1.5">
                                    {issueTypes.map((t) => (
                                        <span
                                            key={t}
                                            className="flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-sm"
                                        >
                                            {t}
                                            <button onClick={() => removeIssueType(t)} aria-label={`Remove ${t}`}>
                                                <X className="size-3 text-muted-foreground"/>
                                            </button>
                                        </span>
                                    ))}
                                    {issueTypes.length === 0 && (
                                        <p className="text-sm text-muted-foreground">None declared — any label is accepted.</p>
                                    )}
                                </div>
                                <div className="flex gap-1.5">
                                    <Input
                                        placeholder="New type"
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addIssueType()}
                                    />
                                    <Button variant="outline" size="sm" disabled={!newType.trim()} onClick={addIssueType}>
                                        Add
                                    </Button>
                                </div>
                            </>
                        )}

                        {section === 'workflow' && (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    {rows.map((r, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            <Input
                                                placeholder="id"
                                                value={r.id}
                                                onChange={(e) => updateRow(i, {id: e.target.value})}
                                                className="w-20"
                                            />
                                            <Input
                                                placeholder="name"
                                                value={r.name}
                                                onChange={(e) => updateRow(i, {name: e.target.value})}
                                                className="w-24"
                                            />
                                            <Input
                                                placeholder="category"
                                                value={r.category}
                                                onChange={(e) => updateRow(i, {category: e.target.value})}
                                                className="w-24"
                                            />
                                            <Input
                                                placeholder="can move to (comma-separated)"
                                                value={r.to}
                                                onChange={(e) => updateRow(i, {to: e.target.value})}
                                                className="flex-1"
                                            />
                                            <button onClick={() => removeWorkflowRow(i)} aria-label="Remove status">
                                                <X className="size-3.5 text-muted-foreground"/>
                                            </button>
                                        </div>
                                    ))}
                                    {rows.length === 0 && (
                                        <p className="text-sm text-muted-foreground">No workflow declared yet.</p>
                                    )}
                                </div>
                                <div className="flex gap-1.5">
                                    <Button variant="outline" size="sm" onClick={addWorkflowRow}>
                                        Add status
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={saveWorkflow}>
                                        Save workflow
                                    </Button>
                                </div>
                            </>
                        )}

                        {section === 'repos' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    {project.repos.map((r) => (
                                        <div key={r.path} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="truncate">{r.path} — {r.url}</span>
                                            <button
                                                onClick={() => run(() => RemoveProjectRepo(path, project.key, r.path))}
                                                aria-label={`Remove ${r.path}`}
                                            >
                                                <X className="size-3.5 text-muted-foreground"/>
                                            </button>
                                        </div>
                                    ))}
                                    {project.repos.length === 0 && (
                                        <p className="text-sm text-muted-foreground">No repos declared yet.</p>
                                    )}
                                </div>
                                <div className="flex gap-1.5">
                                    <Input
                                        placeholder="Git URL"
                                        value={newRepoUrl}
                                        onChange={(e) => setNewRepoUrl(e.target.value)}
                                    />
                                    <Input
                                        placeholder="repos/<path>"
                                        value={newRepoPath}
                                        onChange={(e) => setNewRepoPath(e.target.value)}
                                        className="w-32"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!newRepoUrl.trim() || !newRepoPath.trim()}
                                        onClick={() => {
                                            run(() => AddProjectRepo(path, project.key, newRepoUrl.trim(), newRepoPath.trim()));
                                            setNewRepoUrl('');
                                            setNewRepoPath('');
                                        }}
                                    >
                                        Add
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={cloning || project.repos.length === 0}
                                    onClick={async () => {
                                        setCloning(true);
                                        setCloneResult(null);
                                        try {
                                            setCloneResult(await CloneProjectRepos(path, project.key));
                                        } catch (err) {
                                            setError(String(err));
                                        } finally {
                                            setCloning(false);
                                        }
                                    }}
                                >
                                    {cloning ? 'Cloning…' : 'Clone declared repos'}
                                </Button>
                                {cloneResult && (
                                    <div className="text-sm">
                                        {cloneResult.cloned.length > 0 && (
                                            <p className="text-muted-foreground">Cloned: {cloneResult.cloned.join(', ')}</p>
                                        )}
                                        {cloneResult.warnings.map((w, i) => (
                                            <p key={i} className="text-destructive">{w}</p>
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
                                            {m.name} <span className="text-muted-foreground">({m.email})</span>
                                        </p>
                                    ))}
                                    {project.members.length === 0 && (
                                        <p className="text-sm text-muted-foreground">No members registered yet.</p>
                                    )}
                                </div>
                                <div className="flex gap-1.5">
                                    <Input
                                        placeholder="Name"
                                        value={newMemberName}
                                        onChange={(e) => setNewMemberName(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Email"
                                        value={newMemberEmail}
                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!newMemberName.trim() || !newMemberEmail.trim()}
                                        onClick={() => {
                                            run(() => AddProjectMember(path, proj.key, newMemberName.trim(), newMemberEmail.trim()));
                                            setNewMemberName('');
                                            setNewMemberEmail('');
                                        }}
                                    >
                                        Add
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
                                    run(() =>
                                        project.archived
                                            ? UnarchiveProject(path, project.key)
                                            : ArchiveProject(path, project.key)
                                    )
                                }
                            >
                                {project.archived ? 'Unarchive project' : 'Archive project'}
                            </Button>
                        )}

                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
