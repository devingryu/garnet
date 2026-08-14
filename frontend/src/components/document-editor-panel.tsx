import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Textarea} from '@/components/ui/textarea';
import {BacklinkList} from '@/components/backlink-list';
import {ReadDocument} from '../../wailsjs/go/main/App';
import {useAsyncAction} from '@/lib/use-async-action';
import type {Backlink} from '@/lib/model';

export function DocumentEditorPanel({
    path,
    docPath,
    referencedBy,
    onSave,
    onOpenIssue,
    onOpenDocument,
}: {
    path: string;
    docPath: string;
    referencedBy: Backlink[];
    /** Resolves true when the write landed, so the panel knows what is on disk. */
    onSave: (content: string) => Promise<boolean>;
    onOpenIssue: (id: string) => void;
    onOpenDocument: (path: string) => void;
}) {
    const {t} = useTranslation();
    const {run, error} = useAsyncAction();
    const [content, setContent] = useState('');
    // What the last successful read or write put on disk — the baseline that
    // decides whether a blur has anything to save. null until the first read
    // lands, which is also the loading flag.
    const [onDisk, setOnDisk] = useState<string | null>(null);

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
            {/* A document path is workspace data — never translated (rule 11). */}
            <h2 className="text-lg font-semibold">{docPath}</h2>

            {onDisk === null && !error ? (
                <p className="text-sm text-muted-foreground">{t('document.loading')}</p>
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
        </div>
    );
}
