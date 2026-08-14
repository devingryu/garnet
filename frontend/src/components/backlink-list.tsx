import {useTranslation} from 'react-i18next';
import type {Backlink} from '@/lib/model';

/** "Referenced by" for an issue or a document — the same list in both places,
 *  so it renders the same way in both. */
export function BacklinkList({
    sources,
    onOpenIssue,
    onOpenDocument,
}: {
    sources: Backlink[];
    onOpenIssue: (id: string) => void;
    onOpenDocument: (path: string) => void;
}) {
    const {t} = useTranslation();

    if (sources.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('backlinks.empty')}</p>;
    }

    return (
        <div className="flex flex-col gap-1">
            {sources.map((source) => (
                <button
                    key={`${source.kind}:${source.id}`}
                    onClick={() =>
                        source.kind === 'issue' ? onOpenIssue(source.id) : onOpenDocument(source.id)
                    }
                    className="text-left text-sm text-primary hover:underline"
                >
                    {source.kind === 'issue' ? t('backlinks.issue', {id: source.id}) : source.id}
                </button>
            ))}
        </div>
    );
}
