import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {useAsyncAction} from '@/lib/use-async-action';
import {WriteDocument} from '../../wailsjs/go/main/App';

export function NewDocumentDialog({
    path,
    open,
    onOpenChange,
    onCreated,
}: {
    path: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (docPath: string) => void;
}) {
    const {t} = useTranslation();
    const {run, error, pending} = useAsyncAction();
    const [docPath, setDocPath] = useState('');

    async function submit() {
        const target = docPath.trim();
        if (!target) return;
        const result = await run(() => WriteDocument(path, target, ''));
        if (!result.ok) return;
        onCreated(target);
        onOpenChange(false);
        setDocPath('');
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('newDocument.heading')}</DialogTitle>
                </DialogHeader>
                <Input
                    placeholder={t('newDocument.pathPlaceholder')}
                    value={docPath}
                    onChange={(e) => setDocPath(e.target.value)}
                    autoFocus
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                    <Button onClick={() => void submit()} disabled={pending || !docPath.trim()}>
                        {pending ? t('newDocument.creating') : t('newDocument.create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
