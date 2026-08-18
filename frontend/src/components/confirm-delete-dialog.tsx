import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/** Shared by the issue and document delete actions (GARNET-4) — same
 *  shape, just the title/description text differs. Hard delete, no
 *  undo inside the app (the git history is the undo, same reasoning as
 *  `rm -rf` already being the escape hatch this wraps). */
export function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    description,
    pending,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    pending: boolean;
    onConfirm: () => void;
}) {
    const {t} = useTranslation();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">{description}</p>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={pending}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={pending}>
                        {pending ? t('common.deleting') : t('common.delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
