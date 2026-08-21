import {useState} from 'react';
import {X} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {ConfirmDeleteDialog} from '@/components/confirm-delete-dialog';
import {RenameConfirmDialog} from '@/components/rename-confirm-dialog';
import {useAsyncAction} from '@/lib/use-async-action';
import {terminalStatuses, unreachableStatuses} from '@/lib/workflow';
import {CountIssuesByStatus, RenameStatus, SetWorkflow} from '../../wailsjs/go/main/App';
import type {Project, Status, Transition} from '@/lib/model';

const CATEGORIES = ['open', 'active', 'closed'] as const;

// A row's own client-side identity, stable across reorders and edits —
// separate from `id`, the editable draft value, so a rename can be told
// apart from "this row didn't exist yet" (see commitId).
interface StatusDraft {
    key: string;
    originalId: string;
    id: string;
    name: string;
    category: string;
}

function draftsFrom(project: Project): StatusDraft[] {
    return (project.workflow?.statuses ?? []).map((s, i) => ({
        key: `${s.id}:${i}`,
        originalId: s.id,
        id: s.id,
        name: s.name,
        category: s.category,
    }));
}

function transitionMapFrom(project: Project): Record<string, Set<string>> {
    const map: Record<string, Set<string>> = {};
    for (const t of project.workflow?.transitions ?? []) {
        map[t.from] = new Set(t.to);
    }
    return map;
}

/**
 * The workflow's own editor (GARNET-26) — an ordered status list plus a
 * from/to transition matrix, replacing a table of plain-text rows
 * (id/name/category/comma-separated "moves to") that hid the graph it was
 * editing and had no reorder control despite order being load-bearing
 * twice over: the board's column order, and `Statuses[0]` is where every
 * new issue lands (workspace/issue.go's CreateIssue).
 */
export function WorkflowEditor({
    path,
    project,
    onSaved,
}: {
    path: string;
    project: Project;
    /** Re-reads the workspace after a successful write (AGENTS.md rule 2). */
    onSaved: () => void;
}) {
    const {t} = useTranslation();
    const {run, error, setError, pending} = useAsyncAction();
    const [statuses, setStatuses] = useState<StatusDraft[]>(() => draftsFrom(project));
    const [transitions, setTransitions] = useState<Record<string, Set<string>>>(() =>
        transitionMapFrom(project)
    );
    const [renamePrompt, setRenamePrompt] = useState<{
        rowKey: string;
        oldId: string;
        newId: string;
        count: number;
    } | null>(null);
    const [renaming, setRenaming] = useState(false);
    const [deletePrompt, setDeletePrompt] = useState<{rowKey: string; count: number} | null>(null);
    const [deleting, setDeleting] = useState(false);

    function statusesPayload(list: StatusDraft[]): Status[] {
        return list
            .filter((s) => s.id.trim())
            .map((s) => ({
                id: s.id.trim(),
                name: s.name.trim() || s.id.trim(),
                category: s.category,
            }));
    }

    function transitionsPayload(
        map: Record<string, Set<string>>,
        list: StatusDraft[]
    ): Transition[] {
        const ids = new Set(list.map((s) => s.id.trim()).filter(Boolean));
        return (
            Object.entries(map)
                .filter(([from]) => ids.has(from))
                .map(([from, toSet]) => ({
                    from,
                    to: Array.from(toSet).filter((to) => ids.has(to)),
                }))
                // A status whose targets were all unchecked leaves an empty
                // Set behind, which would write `{from: done, to: []}` to
                // workflow.md — noise that means exactly the same as having
                // no entry at all. Files are the source of truth here
                // (ADR 0001), so what lands on disk shouldn't carry
                // artifacts of how it was edited.
                .filter((t) => t.to.length > 0)
        );
    }

    // Validated against every row with a non-empty id — an unfinished new
    // row (empty id) is excluded here, not treated as an error, since
    // adding a row and not filling it in yet isn't a mistake.
    function validate(list: StatusDraft[]): string | null {
        const ids = list.map((s) => s.id.trim()).filter(Boolean);
        const dup = ids.find((id, i) => ids.indexOf(id) !== i);
        if (dup) return t('settings.workflow.duplicateId', {id: dup});
        return null;
    }

    async function persist(
        nextStatuses: StatusDraft[],
        nextTransitions: Record<string, Set<string>>
    ) {
        const problem = validate(nextStatuses);
        if (problem) {
            setError(problem);
            return false;
        }
        const result = await run(() =>
            SetWorkflow(
                path,
                project.key,
                statusesPayload(nextStatuses),
                transitionsPayload(nextTransitions, nextStatuses)
            )
        );
        if (result.ok) onSaved();
        return result.ok;
    }

    function updateField(key: string, patch: Partial<StatusDraft>) {
        setStatuses((prev) => prev.map((s) => (s.key === key ? {...s, ...patch} : s)));
    }

    function commitName() {
        void persist(statuses, transitions);
    }

    function commitCategory(key: string, category: string) {
        const next = statuses.map((s) => (s.key === key ? {...s, category} : s));
        setStatuses(next);
        void persist(next, transitions);
    }

    // A status id is referenced by every issue currently in it — editing
    // it is the migration GARNET-26 treats as one, not a plain field edit
    // (contrast commitName, which touches nothing outside workflow.md).
    async function commitId(row: StatusDraft) {
        const newId = row.id.trim();
        if (!row.originalId) {
            void persist(statuses, transitions); // a fresh row — plain save
            return;
        }
        if (newId === row.originalId) return;
        if (!newId) {
            setError(t('settings.workflow.idRequired'));
            return;
        }
        if (statuses.some((s) => s.key !== row.key && s.id.trim() === newId)) {
            setError(t('settings.workflow.duplicateId', {id: newId}));
            return;
        }
        const result = await run(() => CountIssuesByStatus(path, project.key, row.originalId));
        if (!result.ok) return;
        setRenamePrompt({rowKey: row.key, oldId: row.originalId, newId, count: result.value});
    }

    async function confirmRename() {
        if (!renamePrompt) return;
        setRenaming(true);
        const result = await run(() =>
            RenameStatus(path, project.key, renamePrompt.oldId, renamePrompt.newId)
        );
        setRenaming(false);
        if (!result.ok) return;

        setStatuses((prev) =>
            prev.map((s) =>
                s.key === renamePrompt.rowKey ? {...s, originalId: renamePrompt.newId} : s
            )
        );
        setTransitions((prev) => {
            const next: Record<string, Set<string>> = {};
            for (const [from, toSet] of Object.entries(prev)) {
                const newFrom = from === renamePrompt.oldId ? renamePrompt.newId : from;
                next[newFrom] = new Set(
                    Array.from(toSet).map((to) =>
                        to === renamePrompt.oldId ? renamePrompt.newId : to
                    )
                );
            }
            return next;
        });
        setRenamePrompt(null);
        onSaved();
    }

    function cancelRename() {
        if (!renamePrompt) return;
        // Leaves the id alone rather than doing half of it — same principle
        // as the repo-add field keeping its text on a rejected write.
        setStatuses((prev) =>
            prev.map((s) => (s.key === renamePrompt.rowKey ? {...s, id: renamePrompt.oldId} : s))
        );
        setRenamePrompt(null);
    }

    function addStatus() {
        setStatuses((prev) => [
            ...prev,
            {
                key: `new:${prev.length}:${prev.map((s) => s.key).join(',')}`,
                originalId: '',
                id: '',
                name: '',
                category: 'open',
            },
        ]);
    }

    async function removeStatus(row: StatusDraft) {
        if (!row.originalId) {
            setStatuses((prev) => prev.filter((s) => s.key !== row.key));
            return;
        }
        const result = await run(() => CountIssuesByStatus(path, project.key, row.originalId));
        if (!result.ok) return;
        if (result.value > 0) {
            setDeletePrompt({rowKey: row.key, count: result.value});
            return;
        }
        await doRemove(row.key);
    }

    async function doRemove(rowKey: string) {
        const removed = statuses.find((s) => s.key === rowKey);
        const nextStatuses = statuses.filter((s) => s.key !== rowKey);
        const nextTransitions = {...transitions};
        if (removed?.originalId) {
            delete nextTransitions[removed.originalId];
            for (const from of Object.keys(nextTransitions)) {
                nextTransitions[from] = new Set(
                    Array.from(nextTransitions[from]).filter((to) => to !== removed.originalId)
                );
            }
        }
        const ok = await persist(nextStatuses, nextTransitions);
        if (ok) {
            setStatuses(nextStatuses);
            setTransitions(nextTransitions);
        }
    }

    function move(index: number, dir: -1 | 1) {
        const j = index + dir;
        if (j < 0 || j >= statuses.length) return;
        const next = [...statuses];
        [next[index], next[j]] = [next[j], next[index]];
        setStatuses(next);
        void persist(next, transitions);
    }

    function toggleTransition(from: string, to: string) {
        const nextSet = new Set(transitions[from] ?? []);
        if (nextSet.has(to)) nextSet.delete(to);
        else nextSet.add(to);
        const next = {...transitions, [from]: nextSet};
        setTransitions(next);
        void persist(statuses, next);
    }

    const currentStatuses = statusesPayload(statuses);
    const currentTransitions = transitionsPayload(transitions, statuses);
    const unreachable = unreachableStatuses(currentStatuses, currentTransitions);
    const terminal = terminalStatuses(currentStatuses, currentTransitions);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">{t('settings.workflow.orderHint')}</p>
                {statuses.map((row, i) => (
                    <div key={row.key} className="flex items-center gap-1.5">
                        <div className="flex flex-col">
                            <button
                                onClick={() => move(i, -1)}
                                disabled={i === 0}
                                aria-label={t('settings.workflow.moveUp')}
                                className="text-muted-foreground disabled:opacity-30"
                            >
                                ▲
                            </button>
                            <button
                                onClick={() => move(i, 1)}
                                disabled={i === statuses.length - 1}
                                aria-label={t('settings.workflow.moveDown')}
                                className="text-muted-foreground disabled:opacity-30"
                            >
                                ▼
                            </button>
                        </div>
                        <Input
                            placeholder={t('settings.statusName')}
                            value={row.name}
                            onChange={(e) => updateField(row.key, {name: e.target.value})}
                            onBlur={commitName}
                            className="w-28"
                        />
                        <Input
                            placeholder={t('settings.statusId')}
                            value={row.id}
                            onChange={(e) => updateField(row.key, {id: e.target.value})}
                            onBlur={() => void commitId(row)}
                            className="w-24"
                        />
                        <Select
                            value={row.category}
                            onValueChange={(v) => v && commitCategory(row.key, String(v))}
                        >
                            <SelectTrigger size="sm" className="w-28">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {t(`settings.workflow.category.${c}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {i === 0 && (
                            <span className="text-xs text-muted-foreground">
                                {t('settings.workflow.entryPoint')}
                            </span>
                        )}
                        <button
                            onClick={() => void removeStatus(row)}
                            aria-label={t('settings.removeStatus')}
                        >
                            <X className="size-3.5 text-muted-foreground" />
                        </button>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    disabled={pending}
                    onClick={addStatus}
                >
                    {t('settings.addStatus')}
                </Button>
                {/* The board's column order is this list's order, stated
                    here so the connection isn't something to discover. */}
                <p className="text-xs text-muted-foreground">
                    {t('settings.workflow.boardOrderHint')}
                </p>
            </div>

            {statuses.length > 1 && (
                <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-muted-foreground">
                        {t('settings.workflow.matrixHint')}
                    </p>
                    <table className="text-sm">
                        <thead>
                            <tr>
                                <th></th>
                                {statuses.map((s) => (
                                    <th
                                        key={s.key}
                                        className="px-1.5 text-xs font-normal text-muted-foreground"
                                    >
                                        {s.name || s.id}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {statuses.map((from) => (
                                <tr key={from.key}>
                                    <td className="pr-2 text-xs text-muted-foreground">
                                        {from.name || from.id}
                                    </td>
                                    {statuses.map((to) =>
                                        from.key === to.key ? (
                                            <td
                                                key={to.key}
                                                className="text-center text-muted-foreground"
                                            >
                                                —
                                            </td>
                                        ) : (
                                            <td key={to.key} className="text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        transitions[from.id]?.has(to.id) ?? false
                                                    }
                                                    onChange={() =>
                                                        toggleTransition(from.id, to.id)
                                                    }
                                                    aria-label={t(
                                                        'settings.workflow.transitionLabel',
                                                        {
                                                            from: from.name || from.id,
                                                            to: to.name || to.id,
                                                        }
                                                    )}
                                                />
                                            </td>
                                        )
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(unreachable.length > 0 || terminal.length > 0) && (
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    {unreachable.map((s) => (
                        <p key={s.id}>{t('settings.workflow.unreachable', {status: s.name})}</p>
                    ))}
                    {terminal.map((s) => (
                        <p key={s.id}>{t('settings.workflow.terminal', {status: s.name})}</p>
                    ))}
                </div>
            )}

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
        </div>
    );
}
