import {useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue} from '@/components/ui/select';
import {allowedNextStatuses} from '@/lib/workflow';
import {backlinksFor} from '@/lib/documents';
import {memberName} from '@/lib/members';
import {
    AddIssueLink,
    AddTimelineNote,
    SetIssueAssignee,
    SetIssueParent,
    SetIssueTitle,
    TransitionIssueStatus,
    UpdateIssueBody,
} from '../../wailsjs/go/main/App';
import type {workspace} from '../../wailsjs/go/models';

const LINK_TYPES = ['blocks', 'relates-to', 'duplicates'];
const UNASSIGNED = '__unassigned__';
const ADD_MEMBER = '__add_member__';

function formatTimestamp(at: unknown): string {
    const d = new Date(at as string);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
}

function Field({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}

export function IssueDetailPanel({
    path,
    issue,
    project,
    ws,
    onMutate,
    onOpenDocument,
    onOpenIssue,
    onRequestAddMember,
}: {
    path: string;
    issue: workspace.Issue;
    project: workspace.Project | undefined;
    ws: workspace.Workspace;
    onMutate: (updated: workspace.Issue) => void;
    onOpenDocument: (path: string) => void;
    onOpenIssue: (id: string) => void;
    onRequestAddMember: () => void;
}) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [parent, setParent] = useState('');
    const [linkType, setLinkType] = useState(LINK_TYPES[0]);
    const [linkTarget, setLinkTarget] = useState('');
    const [noteBody, setNoteBody] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setTitle(issue.title ?? '');
        setBody(issue.description ?? '');
        setParent(issue.parent ?? '');
        setError(null);
    }, [issue.id]);

    async function run<T>(action: () => Promise<T>) {
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(String(err));
        }
    }

    async function saveBody() {
        if (body === issue.description) return;
        await run(async () => {
            await UpdateIssueBody(path, issue.id, body);
            onMutate({...issue, description: body} as workspace.Issue);
        });
    }

    async function saveTitle() {
        if (!title.trim() || title === issue.title) return;
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
    const referencedBy = backlinksFor(ws, 'issue', issue.id);

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[1fr_200px] gap-6">
                {/* Document: a title, then the body — not a form field. */}
                <div className="flex min-w-0 flex-col gap-2">
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
                        {project ? (() => {
                            const known = new Set(project.members.map((m) => m.email));
                            const unknownAssignee = issue.assignee && !known.has(issue.assignee) ? issue.assignee : null;
                            return (
                                <Select
                                    value={issue.assignee || UNASSIGNED}
                                    onValueChange={(v) => {
                                        if (v == null) return;
                                        if (v === ADD_MEMBER) {
                                            onRequestAddMember();
                                            return;
                                        }
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
                                        {unknownAssignee && (
                                            <SelectItem value={unknownAssignee}>{unknownAssignee}</SelectItem>
                                        )}
                                        {project.members.map((m) => (
                                            <SelectItem key={m.email} value={m.email}>{m.name}</SelectItem>
                                        ))}
                                        <SelectSeparator/>
                                        <SelectItem value={ADD_MEMBER}>+ Add member…</SelectItem>
                                    </SelectContent>
                                </Select>
                            );
                        })() : (
                            <span className="text-sm">{memberName(project, issue.assignee) || 'Unassigned'}</span>
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

                    <Field label="Referenced by">
                        <div className="flex flex-col gap-1">
                            {referencedBy.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => (s.kind === 'document' ? onOpenDocument(s.id) : onOpenIssue(s.id))}
                                    className="text-left text-sm text-primary hover:underline"
                                >
                                    {s.id}
                                </button>
                            ))}
                            {referencedBy.length === 0 && (
                                <p className="text-sm text-muted-foreground">Nothing yet.</p>
                            )}
                        </div>
                    </Field>
                </div>
            </div>

            <div className="mt-2 flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Timeline</span>
                <div className="flex gap-2">
                    <Textarea
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        placeholder="Add a note…"
                        className="min-h-16 flex-1"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!noteBody.trim()}
                        onClick={() =>
                            run(async () => {
                                const updated = await AddTimelineNote(path, issue.id, noteBody.trim());
                                onMutate(updated);
                                setNoteBody('');
                            })
                        }
                    >
                        Add note
                    </Button>
                </div>

                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                    {[...issue.timeline].reverse().map((entry, i) => (
                        <div key={i} className="text-sm">
                            <p>
                                {entry.kind === 'status'
                                    ? `Moved from ${entry.from || '—'} to ${entry.to}`
                                    : entry.body}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {memberName(project, entry.by)} · {formatTimestamp(entry.at)}
                            </p>
                        </div>
                    ))}
                    {issue.timeline.length === 0 && (
                        <p className="text-sm text-muted-foreground">No activity yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
