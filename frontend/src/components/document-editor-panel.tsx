import {useEffect, useState} from 'react';
import {Textarea} from '@/components/ui/textarea';
import {ReadDocument, WriteDocument} from '../../wailsjs/go/main/App';
import {backlinksFor} from '@/lib/documents';
import type {workspace} from '../../wailsjs/go/models';

export function DocumentEditorPanel({
    path,
    docPath,
    ws,
    onOpenIssue,
    onOpenDocument,
}: {
    path: string;
    docPath: string;
    ws: workspace.Workspace;
    onOpenIssue: (id: string) => void;
    onOpenDocument: (path: string) => void;
}) {
    const [content, setContent] = useState('');
    const [loaded, setLoaded] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setError(null);
        setLoaded(null);
        ReadDocument(path, docPath)
            .then((c) => {
                setContent(c);
                setLoaded(c);
            })
            .catch((err) => setError(String(err)));
    }, [docPath]);

    async function save() {
        if (content === loaded) return;
        try {
            await WriteDocument(path, docPath, content);
            setLoaded(content);
        } catch (err) {
            setError(String(err));
        }
    }

    const sources = backlinksFor(ws, 'document', docPath);

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{docPath}</h2>

            {loaded === null && !error ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onBlur={save}
                    className="min-h-64 resize-none border-none bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
                />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="mt-2 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Referenced by</span>
                {sources.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
                {sources.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => (s.kind === 'issue' ? onOpenIssue(s.id) : onOpenDocument(s.id))}
                        className="text-left text-sm text-primary hover:underline"
                    >
                        {s.kind === 'issue' ? `Issue ${s.id}` : s.id}
                    </button>
                ))}
            </div>
        </div>
    );
}
