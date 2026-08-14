import {useState} from 'react';
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

export function IdentitySetupDialog({
    open,
    onOpenChange,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, email: string) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);

    async function submit() {
        if (!name.trim() || !email.trim()) return;
        setSaving(true);
        try {
            await onSubmit(name.trim(), email.trim());
            onOpenChange(false);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Who are you?</DialogTitle>
                    <DialogDescription>
                        Stored per-machine in <code>.garnet.local.yaml</code>, gitignored. Used as the reporter on
                        issues you create.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus/>
                    <Input
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button onClick={submit} disabled={saving || !name.trim() || !email.trim()}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
