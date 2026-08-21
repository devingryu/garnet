import {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
import {BacklinkList} from '@/components/backlink-list';
import {MarkdownView} from '@/components/markdown-view';
import {MarkdownViewToggle, type MarkdownViewMode} from '@/components/markdown-view-toggle';
import {ConfirmDeleteDialog} from '@/components/confirm-delete-dialog';
import {DeleteDocument, ReadDocument} from '../../wailsjs/go/main/App';
import {useAsyncAction} from '@/lib/use-async-action';
import {createScrollSync} from '@/lib/scroll-sync';
import type {Backlink} from '@/lib/model';

export function DocumentEditorPanel({
    path,
    docPath,
    referencedBy,
    mutate,
    onSave,
    onOpenIssue,
    onOpenDocument,
    onDeleted,
}: {
    path: string;
    docPath: string;
    referencedBy: Backlink[];
    /** Runs a write and re-reads the workspace; resolves false if it failed. */
    mutate: (action: (path: string) => Promise<unknown>) => Promise<boolean>;
    /** Resolves true when the write landed, so the panel knows what is on disk. */
    onSave: (content: string) => Promise<boolean>;
    onOpenIssue: (id: string) => void;
    onOpenDocument: (path: string) => void;
    /** Runs after DeleteDocument succeeds — closes this document's tab.
     *  The workspace reload itself already happens inside `mutate`. */
    onDeleted: () => void;
}) {
    const {t} = useTranslation();
    const {run, error} = useAsyncAction();
    const [content, setContent] = useState('');
    // What the last successful read or write put on disk — the baseline that
    // decides whether a blur has anything to save. null until the first read
    // lands, which is also the loading flag.
    const [onDisk, setOnDisk] = useState<string | null>(null);
    const [mode, setMode] = useState<MarkdownViewMode>('raw');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // docPath is workspace-root-relative (e.g. "decisions/0001-x.md"); a
    // link in it resolves against its own directory, same as sourceDir for
    // resolveLinkTarget on the Go side.
    const sourceDir = docPath.includes('/') ? docPath.slice(0, docPath.lastIndexOf('/')) : '';

    const rawRef = useRef<HTMLTextAreaElement>(null);
    const renderedRef = useRef<HTMLDivElement>(null);
    const scrollSync = useRef(createScrollSync());

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const result = await run(() => ReadDocument(path, docPath));
            if (cancelled || !result.ok) return;
            setContent(result.value);
            setOnDisk(result.value);
        })();
        return () => {
            cancelled = true;
        };
    }, [path, docPath, run]);

    async function save() {
        if (content === onDisk) return;
        if (await onSave(content)) setOnDisk(content);
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                {/* A document path is workspace data — never translated (rule 11). */}
                <h2 className="text-lg font-semibold">{docPath}</h2>
                {onDisk !== null && <MarkdownViewToggle mode={mode} onChange={setMode} />}
            </div>

            {onDisk === null && !error ? (
                <p className="text-sm text-muted-foreground">{t('document.loading')}</p>
            ) : mode === 'split' ? (
                <div className="grid min-h-64 grid-cols-2 gap-4">
                    <Textarea
                        ref={rawRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onBlur={() => void save()}
                        onScroll={() => {
                            if (rawRef.current && renderedRef.current) {
                                scrollSync.current.onScrollA(rawRef.current, renderedRef.current);
                            }
                        }}
                        className="min-h-64 resize-none overflow-y-auto border-none bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
                    />
                    <div
                        ref={renderedRef}
                        onScroll={() => {
                            if (rawRef.current && renderedRef.current) {
                                scrollSync.current.onScrollB(rawRef.current, renderedRef.current);
                            }
                        }}
                        className="min-h-64 overflow-y-auto border-l border-border pl-4"
                    >
                        <MarkdownView
                            content={content}
                            sourceDir={sourceDir}
                            onOpenIssue={onOpenIssue}
                            onOpenDocument={onOpenDocument}
                        />
                    </div>
                </div>
            ) : mode === 'rendered' ? (
                <MarkdownView
                    content={content}
                    sourceDir={sourceDir}
                    onOpenIssue={onOpenIssue}
                    onOpenDocument={onOpenDocument}
                />
            ) : (
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onBlur={() => void save()}
                    className="min-h-64 resize-none border-none bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
                />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="mt-2 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{t('backlinks.heading')}</span>
                <BacklinkList
                    sources={referencedBy}
                    onOpenIssue={onOpenIssue}
                    onOpenDocument={onOpenDocument}
                />
            </div>

            <div className="mt-2 border-t border-border pt-3">
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                    {t('document.deleteDocument')}
                </Button>
            </div>

            <ConfirmDeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('document.deleteConfirmTitle')}
                description={t('document.deleteConfirmBody')}
                pending={deleting}
                onConfirm={() => {
                    setDeleting(true);
                    void mutate((path) => DeleteDocument(path, docPath)).then((ok) => {
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
