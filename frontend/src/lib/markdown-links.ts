/**
 * Resolves a markdown link's href the same way the backend's
 * resolveLinkTarget (workspace/backlinks.go) resolves a link into a backlink
 * target — same join-and-classify logic, reimplemented here in JS because
 * this runs at render time in the browser, not through a Wails call. Keep
 * the two in sync if the classification rules change.
 */
export type ResolvedMarkdownLink =
    | {kind: 'issue'; id: string}
    | {kind: 'document'; path: string}
    | {kind: 'external'}
    | {kind: 'unresolved'};

// Mirrors workspace/document.go's reservedTopLevelDirs — a .md file under
// either isn't a browsable Document, so it can't be a link target either.
const RESERVED_TOP_LEVEL_DIRS = new Set(['projects', 'issues', 'repos']);

function normalizeSegments(parts: string[]): string[] {
    const out: string[] = [];
    for (const part of parts) {
        if (part === '' || part === '.') continue;
        if (part === '..') {
            if (out.length > 0 && out[out.length - 1] !== '..') out.pop();
            else out.push('..');
        } else {
            out.push(part);
        }
    }
    return out;
}

/** Joins sourceDir and link (POSIX-style, workspace-root-relative) and
 *  resolves any "." / ".." segments — the JS equivalent of
 *  filepath.Join + filepath.Clean in resolveLinkTarget. */
function joinAndNormalize(sourceDir: string, link: string): string {
    const withoutFragment = link.split('#')[0].split('?')[0];
    return normalizeSegments([...sourceDir.split('/'), ...withoutFragment.split('/')]).join('/');
}

/**
 * sourceDir is the link's containing directory, relative to the workspace
 * root ("issues/GRNT-1" for an issue description, or a document's own
 * dirname). Mirrors resolveLinkTarget's ok=false cases (external URL, escapes
 * the workspace, lands under a reserved directory, isn't a .md file) by
 * folding them into the "external" and "unresolved" variants.
 */
export function resolveMarkdownLink(sourceDir: string, href: string): ResolvedMarkdownLink {
    if (href.includes('://')) return {kind: 'external'};

    const rel = joinAndNormalize(sourceDir, href);
    if (rel === '' || rel === '..' || rel.startsWith('../')) return {kind: 'unresolved'};

    if (rel === 'issues' || rel.startsWith('issues/')) {
        const parts = rel.split('/');
        if (parts.length >= 2 && parts[1]) return {kind: 'issue', id: parts[1]};
        return {kind: 'unresolved'};
    }

    const top = rel.split('/')[0];
    if (RESERVED_TOP_LEVEL_DIRS.has(top)) return {kind: 'unresolved'};

    if (rel.endsWith('.md')) return {kind: 'document', path: rel};
    return {kind: 'unresolved'};
}
