import {useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {allowedNextStatuses} from '@/lib/workflow';
import {
    AddIssueLink,
    AddProjectMember,
    SetIssueAssignee,
    SetIssueParent,
    SetIssueTitle,
    TransitionIssueStatus,
    UpdateIssueBody,
} from '../../wailsjs/go/main/App';
import type {workspace} from '../../wailsjs/go/models';

const LINK_TYPES = ['blocks', 'relates-to', 'duplicates'];
const UNASSIGNED = '__unassigned__';

function Field({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}

export function IssueDetailDialog({
    path,
    issue,
    project,
    open,
    onOpenChange,
    onMutate,
    onProjectMutate,
}: {
    path: string;
    issue: workspace.Issue | null;
    project: workspace.Project | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMutate: (updated: workspace.Issue) => void;
    onProjectMutate: (updated: workspace.Project) => void;
}) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [parent, setParent] = useState('');
    const [linkType, setLinkType] = useState(LINK_TYPES[0]);
    const [linkTarget, setLinkTarget] = useState('');
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setTitle(issue?.title ?? '');
        setBody(issue?.description ?? '');
        setParent(issue?.parent ?? '');
        setError(null);
    }, [issue?.id]);

    if (!issue) return null;

    async function run<T>(action: () => Promise<T>) {
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(String(err));
        }
    }

    async function saveBody() {
        if (!issue || body === issue.description) return;
        await run(async () => {
            await UpdateIssueBody(path, issue.id, body);
            onMutate({...issue, description: body} as workspace.Issue);
        });
    }

    async function saveTitle() {
        if (!issue || !title.trim() || title === issue.title) return;
        await run(async () => onMutate(await SetIssueTitle(path, issue.id, title.trim())));
    }

    const workflow = project?.workflow;
    const next = allowedNextStatuses(workflow, issue.status);
    // Jira-style: the control shows the issue's current status as its value,
    // not a "move to…" placeholder. Options are the current status (so
    // reopening the menu doesn't look like it changed) plus whatever the
    // workflow allows moving to from here.
    const currentStatusOption = workflow?.statuses.find((s) => s.id === issue.status);
    const statusOptions = currentStatusOption ? [currentStatusOption, ...next] : next;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <div className="grid grid-cols-[1fr_200px] gap-6">
                    {/* Document: a title, then the body — not a form field. */}
                    <div className="flex min-w-0 flex-col gap-2">
                        <DialogTitle className="sr-only">{issue.title || issue.id}</DialogTitle>
                        <p className="text-xs text-muted-foreground">{issue.id}</p>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={saveTitle}
                            placeholder="Title"
                            className="border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                        />
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onBlur={saveBody}
                            placeholder="Write a description…"
                            className="min-h-64 resize-none border-none bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
                        />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>

                    {/* Metadata panel — everything that isn't the document itself. */}
                    <div className="flex flex-col gap-4 border-l border-border pl-4">
                        <Field label="Status">
                            {statusOptions.length > 0 ? (
                                <Select
                                    value={issue.status}
                                    onValueChange={(v) =>
                                        v && v !== issue.status &&
                                        run(async () => onMutate(await TransitionIssueStatus(path, issue.id, v)))
                                    }
                                >
                                    <SelectTrigger size="sm" className="w-full">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <span className="text-sm">{issue.status || '—'}</span>
                            )}
                        </Field>

                        <Field label="Type">
                            <span className="text-sm">{issue.type}</span>
                        </Field>

                        <Field label="Assignee">
                            {project && project.members.length > 0 && (
                                <Select
                                    value={issue.assignee || UNASSIGNED}
                                    onValueChange={(v) => {
                                        if (v == null) return;
                                        const email = v === UNASSIGNED ? '' : v;
                                        if (email === (issue.assignee ?? '')) return;
                                        run(async () => onMutate(await SetIssueAssignee(path, issue.id, email)));
                                    }}
                                >
                                    <SelectTrigger size="sm" className="w-full">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                                        {project.members.map((m) => (
                                            <SelectItem key={m.email} value={m.email}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {(!project || project.members.length === 0) && (
                                <p className="text-sm text-muted-foreground">No members registered yet.</p>
                            )}
                            {project && (
                                <div className="mt-1.5 flex flex-col gap-1.5">
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
                                        onClick={() =>
                                            run(async () => {
                                                const updated = await AddProjectMember(
                                                    path,
                                                    project.key,
                                                    newMemberName.trim(),
                                                    newMemberEmail.trim()
                                                );
                                                onProjectMutate(updated);
                                                setNewMemberName('');
                                                setNewMemberEmail('');
                                            })
                                        }
                                    >
                                        Add member
                                    </Button>
                                </div>
                            )}
                        </Field>

                        <Field label="Parent">
                            <Input
                                placeholder="e.g. GRNT-1"
                                value={parent}
                                onChange={(e) => setParent(e.target.value)}
                                onBlur={() => {
                                    if (parent !== (issue.parent ?? '')) {
                                        run(async () => onMutate(await SetIssueParent(path, issue.id, parent)));
                                    }
                                }}
                            />
                        </Field>

                        <Field label="Links">
                            <div className="flex flex-col gap-1">
                                {issue.links.map((l, i) => (
                                    <p key={i} className="text-sm text-muted-foreground">{l.type} → {l.target}</p>
                                ))}
                                {issue.links.length === 0 && (
                                    <p className="text-sm text-muted-foreground">None yet.</p>
                                )}
                            </div>
                            <div className="mt-1 flex flex-col gap-1.5">
                                <Select value={linkType} onValueChange={(v) => setLinkType(v ?? LINK_TYPES[0])}>
                                    <SelectTrigger className="w-full" size="sm">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LINK_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="Target issue ID"
                                    value={linkTarget}
                                    onChange={(e) => setLinkTarget(e.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!linkTarget.trim()}
                                    onClick={() =>
                                        run(async () => {
                                            const updated = await AddIssueLink(path, issue.id, linkType, linkTarget.trim());
                                            onMutate(updated);
                                            setLinkTarget('');
                                        })
                                    }
                                >
                                    Add link
                                </Button>
                            </div>
                        </Field>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
