import {useEffect, useState} from 'react';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {ReadDocument, WriteDocument} from '../../wailsjs/go/main/App';
import {backlinksFor} from '@/lib/documents';
import type {workspace} from '../../wailsjs/go/models';

export function DocumentEditorDialog({
    path,
    docPath,
    ws,
    open,
    onOpenChange,
    onOpenIssue,
    onOpenDocument,
}: {
    path: string;
    docPath: string | null;
    ws: workspace.Workspace;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOpenIssue: (id: string) => void;
    onOpenDocument: (path: string) => void;
}) {
    const [content, setContent] = useState('');
    const [loaded, setLoaded] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!docPath) return;
        setError(null);
        setLoaded(null);
        ReadDocument(path, docPath)
            .then((c) => {
                setContent(c);
                setLoaded(c);
            })
            .catch((err) => setError(String(err)));
    }, [docPath]);

    if (!docPath) return null;

    async function save() {
        if (content === loaded) return;
        try {
            await WriteDocument(path, docPath!, content);
            setLoaded(content);
        } catch (err) {
            setError(String(err));
        }
    }

    const sources = backlinksFor(ws, 'document', docPath);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle className="text-lg font-semibold">{docPath}</DialogTitle>

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
            </DialogContent>
        </Dialog>
    );
}
