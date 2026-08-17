import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';

export type MarkdownViewMode = 'raw' | 'rendered' | 'split';

const MODES: MarkdownViewMode[] = ['raw', 'rendered', 'split'];

/** Raw / Rendered / Split, shared by document-editor-panel.tsx and
 *  issue-detail-panel.tsx's description field (GARNET-9) — same three-way
 *  toggle in both places rather than two separate implementations. */
export function MarkdownViewToggle({
    mode,
    onChange,
}: {
    mode: MarkdownViewMode;
    onChange: (mode: MarkdownViewMode) => void;
}) {
    const {t} = useTranslation();
    return (
        <div className="flex gap-1">
            {MODES.map((m) => (
                <Button
                    key={m}
                    variant={mode === m ? 'secondary' : 'ghost'}
                    size="xs"
                    onClick={() => onChange(m)}
                >
                    {t(`markdownView.${m}`)}
                </Button>
            ))}
        </div>
    );
}
