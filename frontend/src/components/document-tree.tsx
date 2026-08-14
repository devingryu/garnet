import {useState} from 'react';
import {buildDocumentTree} from '@/lib/documents';
import type {DocTreeNode} from '@/lib/documents';
import type {workspace} from '../../wailsjs/go/models';

function Node({node, onSelect, depth}: {node: DocTreeNode; onSelect: (path: string) => void; depth: number}) {
    const [open, setOpen] = useState(true);
    const indent = {paddingLeft: depth * 14};

    if (node.isFile) {
        return (
            <button
                onClick={() => onSelect(node.path)}
                style={indent}
                className="block w-full truncate rounded-sm px-2 py-1 text-left text-sm hover:bg-muted"
                title={node.path}
            >
                {node.name}
            </button>
        );
    }

    return (
        <div>
            <button
                onClick={() => setOpen((o) => !o)}
                style={indent}
                className="block w-full truncate rounded-sm px-2 py-1 text-left text-sm font-medium hover:bg-muted"
                title={node.name}
            >
                {open ? '▾' : '▸'} {node.name}
            </button>
            {open && node.children.map((c) => (
                <Node key={`${c.path}:${c.isFile}`} node={c} onSelect={onSelect} depth={depth + 1}/>
            ))}
        </div>
    );
}

export function DocumentTree({
    documents,
    onSelect,
}: {
    documents: workspace.Document[];
    onSelect: (path: string) => void;
}) {
    const tree = buildDocumentTree(documents);
    if (tree.length === 0) {
        return <p className="text-sm text-muted-foreground">No documents yet.</p>;
    }
    return (
        <div className="flex flex-col gap-0.5">
            {tree.map((n) => (
                <Node key={`${n.path}:${n.isFile}`} node={n} onSelect={onSelect} depth={0}/>
            ))}
        </div>
    );
}
