import {useState} from 'react';
import {Trans, useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {useAsyncAction} from '@/lib/use-async-action';
import {SetIdentity} from '../../wailsjs/go/main/App';
import type {Identity} from '@/lib/model';

/** Where workspace.SaveIdentity writes — a filename, not a translatable string. */
const IDENTITY_FILE = '.garnet.local.yaml';

export function IdentitySetupDialog({
    path,
    open,
    onOpenChange,
    onSaved,
}: {
    path: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: (identity: Identity) => void;
}) {
    const {t} = useTranslation();
    const {run, error, pending} = useAsyncAction();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    async function submit() {
        if (!name.trim() || !email.trim()) return;
        const result = await run(() => SetIdentity(path, name.trim(), email.trim()));
        if (!result.ok) return;
        onSaved({name: name.trim(), email: email.trim()});
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('identity.heading')}</DialogTitle>
                    <DialogDescription>
                        <Trans
                            i18nKey="identity.description"
                            values={{file: IDENTITY_FILE}}
                            components={{code: <code />}}
                        />
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <Input
                        placeholder={t('member.name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                    <Input
                        placeholder={t('member.email')}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => void submit()}
                        disabled={pending || !name.trim() || !email.trim()}
                    >
                        {pending ? t('identity.saving') : t('identity.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
