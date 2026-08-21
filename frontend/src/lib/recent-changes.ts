import type {GitStatus} from '@/lib/model';

/** A changed file resolved to something the sidebar can navigate to. */
export interface RecentChange {
    kind: 'issue' | 'document';
    /** Issue ID, or the document's workspace-relative path. */
    id: string;
    /** The changed file's path, for a tooltip — an issue's change could be
     *  `.garnet.yaml`, `issue.md`, or an attached doc, and which one it was
     *  is worth showing. */
    path: string;
}

// Mirrors resolveLinkTarget's classification on the Go side
// (workspace/backlinks.go): a path under issues/ belongs to that issue,
// a .md anywhere outside the reserved top-level directories is a document,
// and anything else isn't a navigable target.
const RESERVED_TOP_LEVEL = new Set(['projects', 'issues', 'repos']);

function classify(path: string): RecentChange | null {
    const parts = path.split('/');
    if (parts[0] === 'issues') {
        return parts.length >= 2 && parts[1] ? {kind: 'issue', id: parts[1], path} : null;
    }
    if (RESERVED_TOP_LEVEL.has(parts[0])) return null;
    if (!path.endsWith('.md')) return null;
    return {kind: 'document', id: path, path};
}

/**
 * The issues and documents with uncommitted changes (GARNET-10), derived
 * from git status rather than filesystem mtime: an mtime bumps on a mere
 * touch, while git reports what actually differs from the last commit —
 * which is precisely "what did the agent just change while I was away".
 *
 * Two consequences worth knowing, both accepted rather than worked around:
 * committed work doesn't appear (it's no longer a pending change), and the
 * order is git's own, not chronological — git status carries no timestamps.
 *
 * A changed file that isn't a navigable target (`projects/GRNT/project.md`,
 * anything under `repos/`) is skipped: this list exists to jump somewhere,
 * and the Git panel already shows every changed path verbatim.
 */
export function recentChanges(status: GitStatus | null): RecentChange[] {
    if (!status) return [];

    const seen = new Set<string>();
    const changes: RecentChange[] = [];
    for (const change of [...status.staged, ...status.unstaged]) {
        const resolved = classify(change.path);
        if (!resolved) continue;
        // One issue can have several files changed at once (.garnet.yaml
        // and issue.md, typically) — it's still one entry to click.
        const key = `${resolved.kind}:${resolved.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        changes.push(resolved);
    }
    return changes;
}
