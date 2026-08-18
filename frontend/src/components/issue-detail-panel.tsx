import {useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {BacklinkList} from '@/components/backlink-list';
import {IssuePicker} from '@/components/issue-picker';
import {MarkdownView} from '@/components/markdown-view';
import {MarkdownViewToggle, type MarkdownViewMode} from '@/components/markdown-view-toggle';
import {ConfirmDeleteDialog} from '@/components/confirm-delete-dialog';
import {allowedNextStatuses} from '@/lib/workflow';
import {LINK_TYPES, linkTypeLabel} from '@/lib/links';
import {PRIORITIES, priorityLabel} from '@/lib/priorities';
import {memberName} from '@/lib/members';
import {formatTimestamp} from '@/lib/format';
import {createScrollSync} from '@/lib/scroll-sync';
import {statusCategoryClass} from '@/lib/status-style';
import {issueTypeIcon} from '@/lib/issue-type-icon';
import {cn} from '@/lib/utils';
import {
    AddIssueLink,
    AddTimelineNote,
    DeleteIssue,
    SetIssueAssignee,
    SetIssueParent,
    SetIssuePriority,
    SetIssueTitle,
    ToggleTodo,
    TransitionIssueStatus,
    UpdateIssueBody,
} from '../../wailsjs/go/main/App';
import type {Backlink, Issue, Project} from '@/lib/model';

const UNASSIGNED = '__unassigned__';
const ADD_MEMBER = '__add_member__';
const UNPRIORITIZED = '__unprioritized__';

function Field({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}

/**
 * Mount this with `key={issue.id}`: the draft title/body/parent state is reset
 * by remounting, not by an effect that reassigns it (AGENTS.md rule 6).
 *
 * `body` is the one exception, and it's narrow on purpose: toggling a todo
 * below rewrites `issue.description` out from under this same panel without
 * remounting it (still the same issue.id), so the draft can go stale and a
 * later blur would overwrite the toggle right back off. The effect further
 * down resyncs `body` when `issue.description` changes from outside — but
 * only while there's no unsaved local edit, so it never clobbers something
 * the user is actively typing.
 */
export function IssueDetailPanel({
    issue,
    issues,
    project,
    referencedBy,
    mutate,
    onOpenDocument,
    onOpenIssue,
    onRequestAddMember,
    onDeleted,
}: {
    issue: Issue;
    /** The whole workspace's issues, for the Parent/Links pickers to search over. */
    issues: Issue[];
    project: Project | undefined;
    referencedBy: Backlink[];
    /** Runs a write and re-reads the workspace; resolves false if it failed. */
    mutate: (action: (path: string) => Promise<unknown>) => Promise<boolean>;
    onOpenDocument: (path: string) => void;
    onOpenIssue: (id: string) => void;
    onRequestAddMember: () => void;
    /** Runs after DeleteIssue succeeds — closes this issue's tab (GARNET-4).
     *  The workspace reload itself already happens inside `mutate`. */
    onDeleted: () => void;
}) {
    const {t, i18n} = useTranslation();
    const [title, setTitle] = useState(issue.title);
    const [body, setBody] = useState(issue.description);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [parent, setParent] = useState(issue.parent ?? '');
    const [linkType, setLinkType] = useState<string>(LINK_TYPES[0]);
    const [linkTarget, setLinkTarget] = useState('');
    const [noteBody, setNoteBody] = useState('');
    const [descriptionMode, setDescriptionMode] = useState<MarkdownViewMode>('raw');

    const descriptionSourceDir = `issues/${issue.id}`;
    const rawRef = useRef<HTMLTextAreaElement>(null);
    const renderedRef = useRef<HTMLDivElement>(null);
    const scrollSync = useRef(createScrollSync());

    // See the doc comment above: follows issue.description when nothing
    // local is unsaved, so a todo toggle's write doesn't get reverted by a
    // stale draft on the next blur.
    const lastSyncedDescription = useRef(issue.description);
    useEffect(() => {
        if (body === lastSyncedDescription.current) {
            setBody(issue.description);
        }
        lastSyncedDescription.current = issue.description;
        // body is intentionally excluded: this effect reacts to description
        // changing, and re-reads body via the ref/functional check above,
        // not by depending on it directly.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [issue.description]);

    const workflow = project?.workflow;
    const next = allowedNextStatuses(workflow, issue.status);
    // Jira-style: the control shows the issue's current status as its value,
    // not a "move to…" placeholder. Options are the current status (so
    // reopening the menu doesn't look like it changed) plus whatever the
    // workflow allows moving to from here.
    const currentStatusOption = workflow?.statuses.find((s) => s.id === issue.status);
    const statusOptions = currentStatusOption ? [currentStatusOption, ...next] : next;

    // An assignee who is no longer in the member registry still has to be
    // displayable, so they get their own entry rather than falling out of the
    // list and looking unassigned.
    const knownMembers = new Set(project?.members.map((m) => m.email) ?? []);
    const unknownAssignee =
        issue.assignee && !knownMembers.has(issue.assignee) ? issue.assignee : null;
    const assigneeItems = [
        {value: UNASSIGNED, label: t('issue.unassigned')},
        ...(unknownAssignee ? [{value: unknownAssignee, label: unknownAssignee}] : []),
        ...(project?.members ?? []).map((m) => ({value: m.email, label: m.name})),
        {value: ADD_MEMBER, label: t('member.addPrompt')},
    ];

    const linkTypeItems = LINK_TYPES.map((type) => ({value: type, label: linkTypeLabel(t, type)}));

    const priorityItems = [
        {value: UNPRIORITIZED, label: t('issue.unprioritized')},
        ...PRIORITIES.map((p) => ({value: p, label: priorityLabel(t, p)})),
    ];

    const TypeIcon = issueTypeIcon(issue.type);

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[1fr_200px] gap-6">
                {/* Document: a title, then the body — not a form field. */}
                <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-xs text-muted-foreground">{issue.id}</p>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => {
                            if (!title.trim() || title === issue.title) return;
                            void mutate((path) => SetIssueTitle(path, issue.id, title.trim()));
                        }}
                        placeholder={t('issue.titlePlaceholder')}
                        className="border-none bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                    />
                    <div className="flex justify-end">
                        <MarkdownViewToggle mode={descriptionMode} onChange={setDescriptionMode} />
                    </div>

                    {descriptionMode === 'split' ? (
                        <div className="grid min-h-64 grid-cols-2 gap-4">
                            <Textarea
                                ref={rawRef}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                onBlur={() => {
                                    if (body === issue.description) return;
                                    void mutate((path) => UpdateIssueBody(path, issue.id, body));
                                }}
                                onScroll={() => {
                                    if (rawRef.current && renderedRef.current) {
                                        scrollSync.current.onScrollA(
                                            rawRef.current,
                                            renderedRef.current
                                        );
                                    }
                                }}
                                placeholder={t('issue.descriptionPlaceholder')}
                                className="min-h-64 resize-none overflow-y-auto border-none bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
                            />
                            <div
                                ref={renderedRef}
                                onScroll={() => {
                                    if (rawRef.current && renderedRef.current) {
                                        scrollSync.current.onScrollB(
                                            rawRef.current,
                                            renderedRef.current
                                        );
                                    }
                                }}
                                className="min-h-64 overflow-y-auto border-l border-border pl-4"
                            >
                                <MarkdownView
                                    content={body}
                                    sourceDir={descriptionSourceDir}
                                    onOpenIssue={onOpenIssue}
                                    onOpenDocument={onOpenDocument}
                                    hideTaskCheckboxes
                                />
                            </div>
                        </div>
                    ) : descriptionMode === 'rendered' ? (
                        <MarkdownView
                            content={body}
                            sourceDir={descriptionSourceDir}
                            onOpenIssue={onOpenIssue}
                            onOpenDocument={onOpenDocument}
                            hideTaskCheckboxes
                        />
                    ) : (
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onBlur={() => {
                                if (body === issue.description) return;
                                void mutate((path) => UpdateIssueBody(path, issue.id, body));
                            }}
                            placeholder={t('issue.descriptionPlaceholder')}
                            className="min-h-64 resize-none border-none bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
                        />
                    )}

                    {issue.todos.length > 0 && (
                        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    {t('issue.todos.heading')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t('issue.todos.count', {
                                        done: issue.todos.filter((todo) => todo.done).length,
                                        total: issue.todos.length,
                                    })}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {issue.todos.map((todo) => (
                                    <label
                                        key={todo.line}
                                        className="flex items-start gap-2 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={todo.done}
                                            onChange={() =>
                                                void mutate((path) =>
                                                    ToggleTodo(path, issue.id, todo.line)
                                                )
                                            }
                                            className="mt-1"
                                        />
                                        <span
                                            className={
                                                todo.done
                                                    ? 'text-muted-foreground line-through'
                                                    : undefined
                                            }
                                        >
                                            {todo.text}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">{t('issue.todos.hint')}</p>
                        </div>
                    )}
                </div>

                {/* Metadata panel — everything that isn't the document itself. */}
                <div className="flex flex-col gap-4 border-l border-border pl-4">
                    <Field label={t('issue.status')}>
                        {statusOptions.length > 0 ? (
                            <Select
                                items={statusOptions.map((s) => ({value: s.id, label: s.name}))}
                                value={issue.status}
                                onValueChange={(v) => {
                                    const status = v == null ? '' : String(v);
                                    if (!status || status === issue.status) return;
                                    void mutate((path) =>
                                        TransitionIssueStatus(path, issue.id, status)
                                    );
                                }}
                            >
                                {/* Colored by workflow.md's category (open/
                                    active/closed), not by the status id
                                    itself — a Jira-style at-a-glance cue
                                    the plain text-only trigger didn't have
                                    (GARNET-27). */}
                                <SelectTrigger
                                    size="sm"
                                    className={cn(
                                        'w-full border-transparent font-medium',
                                        statusCategoryClass(currentStatusOption?.category ?? '')
                                    )}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Status names come from workflow.md — workspace
                                        data, shown as authored (rule 11). */}
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s.id} value={s.id} label={s.name}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <span className="text-sm">{issue.status || t('common.empty')}</span>
                        )}
                    </Field>

                    <Field label={t('issue.type')}>
                        <span className="flex items-center gap-1.5 text-sm">
                            {/* issueTypeIcon looks up a stable, module-level
                                icon reference (or the Circle fallback) —
                                it isn't defining a new component on every
                                render, which is what this lint rule is
                                actually guarding against. */}
                            {/* eslint-disable-next-line react-hooks/static-components */}
                            <TypeIcon className="size-3.5 text-muted-foreground" />
                            {issue.type}
                        </span>
                    </Field>

                    <Field label={t('issue.assignee')}>
                        {project ? (
                            <Select
                                items={assigneeItems}
                                value={issue.assignee || UNASSIGNED}
                                onValueChange={(v) => {
                                    if (v == null) return;
                                    const choice = String(v);
                                    if (choice === ADD_MEMBER) {
                                        onRequestAddMember();
                                        return;
                                    }
                                    const email = choice === UNASSIGNED ? '' : choice;
                                    if (email === (issue.assignee ?? '')) return;
                                    void mutate((path) => SetIssueAssignee(path, issue.id, email));
                                }}
                            >
                                <SelectTrigger size="sm" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={UNASSIGNED} label={t('issue.unassigned')}>
                                        {t('issue.unassigned')}
                                    </SelectItem>
                                    {unknownAssignee && (
                                        <SelectItem value={unknownAssignee} label={unknownAssignee}>
                                            {unknownAssignee}
                                        </SelectItem>
                                    )}
                                    {project.members.map((m) => (
                                        <SelectItem key={m.email} value={m.email} label={m.name}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                    <SelectSeparator />
                                    <SelectItem value={ADD_MEMBER} label={t('member.addPrompt')}>
                                        {t('member.addPrompt')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <span className="text-sm">
                                {memberName(project, issue.assignee) || t('issue.unassigned')}
                            </span>
                        )}
                    </Field>

                    <Field label={t('issue.priority')}>
                        <Select
                            items={priorityItems}
                            value={issue.priority || UNPRIORITIZED}
                            onValueChange={(v) => {
                                if (v == null) return;
                                const choice = String(v);
                                const priority = choice === UNPRIORITIZED ? '' : choice;
                                if (priority === (issue.priority ?? '')) return;
                                void mutate((path) => SetIssuePriority(path, issue.id, priority));
                            }}
                        >
                            <SelectTrigger size="sm" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {priorityItems.map((item) => (
                                    <SelectItem
                                        key={item.value}
                                        value={item.value}
                                        label={item.label}
                                    >
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label={t('issue.parent')}>
                        <IssuePicker
                            issues={issues}
                            excludeId={issue.id}
                            value={parent}
                            onValueChange={(id) => {
                                setParent(id);
                                if (id === (issue.parent ?? '')) return;
                                void mutate((path) => SetIssueParent(path, issue.id, id));
                            }}
                            placeholder={t('issue.parentPlaceholder')}
                        />
                    </Field>
                </div>
            </div>

            {/* Children/Links/Referenced by are relationship and reference
                lists, not field pickers — moved out of the narrow metadata
                rail and down here next to Timeline (GARNET-27). The rail
                above keeps only Status/Type/Assignee/Priority/Parent, the
                things a picker rail is actually good at. */}
            <div className="grid grid-cols-3 gap-6 border-t border-border pt-3">
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">{t('issue.children')}</span>
                    <div className="flex flex-col gap-1">
                        {issue.children.map((id) => {
                            // Title is workspace data, shown as authored
                            // (rule 11); the ID alone is the fallback for a
                            // child that somehow isn't in the list.
                            const title = issues.find((i) => i.id === id)?.title;
                            return (
                                <button
                                    key={id}
                                    onClick={() => onOpenIssue(id)}
                                    className="text-left text-sm text-primary hover:underline"
                                >
                                    {title ? `${id} · ${title}` : id}
                                </button>
                            );
                        })}
                        {issue.children.length === 0 && (
                            <p className="text-sm text-muted-foreground">{t('issue.noChildren')}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">{t('issue.links')}</span>
                    <div className="flex flex-col gap-1">
                        {issue.links.map((l) => (
                            <button
                                key={`${l.type}:${l.target}`}
                                onClick={() => onOpenIssue(l.target)}
                                className="text-left text-sm text-muted-foreground hover:text-primary hover:underline"
                            >
                                {linkTypeLabel(t, l.type)} → {l.target}
                            </button>
                        ))}
                        {issue.links.length === 0 && (
                            <p className="text-sm text-muted-foreground">{t('issue.noLinks')}</p>
                        )}
                    </div>
                    <div className="mt-1 flex flex-col gap-1.5">
                        <Select
                            items={linkTypeItems}
                            value={linkType}
                            onValueChange={(v) =>
                                setLinkType(v == null ? LINK_TYPES[0] : String(v))
                            }
                        >
                            <SelectTrigger className="w-full" size="sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {linkTypeItems.map((item) => (
                                    <SelectItem
                                        key={item.value}
                                        value={item.value}
                                        label={item.label}
                                    >
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <IssuePicker
                            issues={issues}
                            excludeId={issue.id}
                            value={linkTarget}
                            onValueChange={setLinkTarget}
                            placeholder={t('issue.linkTargetPlaceholder')}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!linkTarget.trim()}
                            onClick={() => {
                                void mutate((path) =>
                                    AddIssueLink(path, issue.id, linkType, linkTarget.trim())
                                ).then((ok) => ok && setLinkTarget(''));
                            }}
                        >
                            {t('issue.addLink')}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">{t('backlinks.heading')}</span>
                    <BacklinkList
                        sources={referencedBy}
                        onOpenIssue={onOpenIssue}
                        onOpenDocument={onOpenDocument}
                    />
                </div>
            </div>

            <div className="mt-2 flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">{t('issue.timeline.heading')}</span>
                <div className="flex gap-2">
                    <Textarea
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        placeholder={t('issue.timeline.notePlaceholder')}
                        className="min-h-16 flex-1"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!noteBody.trim()}
                        onClick={() => {
                            void mutate((path) =>
                                AddTimelineNote(path, issue.id, noteBody.trim())
                            ).then((ok) => ok && setNoteBody(''));
                        }}
                    >
                        {t('issue.timeline.addNote')}
                    </Button>
                </div>

                <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                    {[...issue.timeline].reverse().map((entry, i) => (
                        <div key={`${String(entry.at)}:${i}`} className="text-sm">
                            <p>
                                {entry.kind === 'status'
                                    ? t('issue.timeline.statusChange', {
                                          from: entry.from || t('common.empty'),
                                          to: entry.to ?? '',
                                      })
                                    : entry.body}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {memberName(project, entry.by)} ·{' '}
                                {formatTimestamp(entry.at, i18n.language)}
                            </p>
                        </div>
                    ))}
                    {issue.timeline.length === 0 && (
                        <p className="text-sm text-muted-foreground">{t('issue.timeline.empty')}</p>
                    )}
                </div>
            </div>

            <div className="border-t border-border pt-3">
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                    {t('issue.deleteIssue')}
                </Button>
            </div>

            <ConfirmDeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('issue.deleteConfirmTitle')}
                description={t('issue.deleteConfirmBody')}
                pending={deleting}
                onConfirm={() => {
                    setDeleting(true);
                    void mutate((path) => DeleteIssue(path, issue.id)).then((ok) => {
                        setDeleting(false);
                        if (ok) {
                            setDeleteOpen(false);
                            onDeleted();
                        }
                    });
                }}
            />
        </div>
    );
}
