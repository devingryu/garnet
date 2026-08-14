import type {workspace} from '../../wailsjs/go/models';

export interface DocTreeNode {
    name: string;
    path: string;
    isFile: boolean;
    children: DocTreeNode[];
}

/** Builds a nested tree from the flat, forward-slashed document path list —
 *  purely client-side, no Go changes needed for this. */
export function buildDocumentTree(docs: workspace.Document[]): DocTreeNode[] {
    const root: DocTreeNode[] = [];
    for (const doc of docs) {
        const parts = doc.path.split('/');
        let level = root;
        let accum = '';
        parts.forEach((part, i) => {
            accum = accum ? `${accum}/${part}` : part;
            const isFile = i === parts.length - 1;
            let node = level.find((n) => n.name === part && n.isFile === isFile);
            if (!node) {
                node = {name: part, path: accum, isFile, children: []};
                level.push(node);
            }
            level = node.children;
        });
    }
    sortTree(root);
    return root;
}

function sortTree(nodes: DocTreeNode[]) {
    nodes.sort((a, b) => {
        if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
        return a.name.localeCompare(b.name);
    });
    for (const n of nodes) sortTree(n.children);
}

export function backlinksFor(
    ws: workspace.Workspace,
    targetKind: 'issue' | 'document',
    target: string
): workspace.Backlink[] {
    return ws.backlinks.find((e) => e.targetKind === targetKind && e.target === target)?.sources ?? [];
}
