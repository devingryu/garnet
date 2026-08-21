import {FileText, Hash} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import type {RecentChange} from '@/lib/recent-changes';

/**
 * The "Recently changed" section pinned above the document tree
 * (GARNET-10) — what changed since the last commit, so switching back to
 * Garnet after an agent (or another editor) touched the workspace shows
 * what moved without opening a diff.
 *
 * Deliberately not a re-sort of the tree below it: the alphabetical tree is
 * still how you browse things you aren't actively watching.
 */
export function RecentChangesList({
    changes,
    onOpenIssue,
    onOpenDocument,
}: {
    changes: RecentChange[];
    onOpenIssue: (id: string) => void;
    onOpenDocument: (path: string) => void;
}) {
    const {t} = useTranslation();

    if (changes.length === 0) return null;

    return (
        <div className="flex flex-col gap-0.5">
            <div className="mt-3 mb-1 px-2">
                <span className="text-xs text-muted-foreground">{t('sidebar.recentChanges')}</span>
            </div>
            {changes.map((change) => (
                <button
                    key={`${change.kind}:${change.id}`}
                    onClick={() =>
                        change.kind === 'issue' ? onOpenIssue(change.id) : onOpenDocument(change.id)
                    }
                    // The path, not the label, since one issue's label is
                    // its ID while the changed file underneath could be
                    // .garnet.yaml, issue.md, or an attachment.
                    title={change.path}
                    className="flex w-full items-center gap-2 truncate rounded-sm px-2 py-1 text-left text-sm text-foreground/80 hover:bg-muted"
                >
                    {change.kind === 'issue' ? (
                        <Hash className="size-3.5 shrink-0" />
                    ) : (
                        <FileText className="size-3.5 shrink-0" />
                    )}
                    {/* Issue IDs and document paths are workspace data,
                        shown as authored (AGENTS.md rule 11). */}
                    <span className="truncate">
                        {change.kind === 'issue' ? change.id : baseName(change.id)}
                    </span>
                </button>
            ))}
        </div>
    );
}

/** Just the filename — the full path is in the tooltip, and the sidebar is
 *  too narrow for `decisions/0009-users-yaml-as-a-workspace-registry.md`. */
function baseName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] ?? path;
}
