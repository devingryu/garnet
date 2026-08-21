import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/**
 * Confirms a rename that rewrites every issue referencing the old value —
 * a status id or an issue type (GARNET-26). Not destructive like
 * ConfirmDeleteDialog: nothing is removed, an identifier plus every copy
 * of it is rewritten in place, so this uses the default button treatment,
 * not the destructive one.
 */
export function RenameConfirmDialog({
    open,
    onOpenChange,
    count,
    pending,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** How many issues currently hold the old value — named in the prompt
     *  so this isn't a blind confirmation. */
    count: number;
    pending: boolean;
    onConfirm: () => void;
}) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('settings.rename.title')}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    {t('settings.rename.body', {count})}
                </p>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={pending}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={onConfirm} disabled={pending}>
                        {pending ? t('settings.rename.renaming') : t('settings.rename.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
