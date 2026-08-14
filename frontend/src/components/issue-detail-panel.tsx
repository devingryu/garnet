import {useState} from 'react';
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
import {allowedNextStatuses} from '@/lib/workflow';
import {LINK_TYPES, linkTypeLabel} from '@/lib/links';
import {memberName} from '@/lib/members';
import {formatTimestamp} from '@/lib/format';
import {
    AddIssueLink,
    AddTimelineNote,
    SetIssueAssignee,
    SetIssueParent,
    SetIssueTitle,
    TransitionIssueStatus,
    UpdateIssueBody,
} from '../../wailsjs/go/main/App';
import type {Backlink, Issue, Project} from '@/lib/model';

const UNASSIGNED = '__unassigned__';
const ADD_MEMBER = '__add_member__';

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
 */
export function IssueDetailPanel({
    issue,
    project,
    referencedBy,
    mutate,
    onOpenDocument,
    onOpenIssue,
    onRequestAddMember,
}: {
    issue: Issue;
    project: Project | undefined;
    referencedBy: Backlink[];
    /** Runs a write and re-reads the workspace; resolves false if it failed. */
    mutate: (action: (path: string) => Promise<unknown>) => Promise<boolean>;
    onOpenDocument: (path: string) => void;
    onOpenIssue: (id: string) => void;
    onRequestAddMember: () => void;
}) {
    const {t, i18n} = useTranslation();
    const [title, setTitle] = useState(issue.title);
    const [body, setBody] = useState(issue.description);
    const [parent, setParent] = useState(issue.parent ?? '');
    const [linkType, setLinkType] = useState<string>(LINK_TYPES[0]);
    const [linkTarget, setLinkTarget] = useState('');
    const [noteBody, setNoteBody] = useState('');

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
                                <SelectTrigger size="sm" className="w-full">
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
                        <span className="text-sm">{issue.type}</span>
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

                    <Field label={t('issue.parent')}>
                        <Input
                            placeholder={t('issue.parentPlaceholder')}
                            value={parent}
                            onChange={(e) => setParent(e.target.value)}
                            onBlur={() => {
                                if (parent === (issue.parent ?? '')) return;
                                void mutate((path) => SetIssueParent(path, issue.id, parent));
                            }}
                        />
                    </Field>

                    <Field label={t('issue.links')}>
                        <div className="flex flex-col gap-1">
                            {issue.links.map((l) => (
                                <p
                                    key={`${l.type}:${l.target}`}
                                    className="text-sm text-muted-foreground"
                                >
                                    {linkTypeLabel(t, l.type)} → {l.target}
                                </p>
                            ))}
                            {issue.links.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {t('issue.noLinks')}
                                </p>
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
                            <Input
                                placeholder={t('issue.linkTargetPlaceholder')}
                                value={linkTarget}
                                onChange={(e) => setLinkTarget(e.target.value)}
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
                    </Field>

                    <Field label={t('backlinks.heading')}>
                        <BacklinkList
                            sources={referencedBy}
                            onOpenIssue={onOpenIssue}
                            onOpenDocument={onOpenDocument}
                        />
                    </Field>
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
        </div>
    );
}
