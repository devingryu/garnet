import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {WriteDocument} from '../../wailsjs/go/main/App';

export function NewDocumentDialog({
    path,
    open,
    onOpenChange,
    onCreate,
}: {
    path: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (docPath: string) => void;
}) {
    const [docPath, setDocPath] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        const p = docPath.trim();
        if (!p) return;
        setCreating(true);
        setError(null);
        try {
            await WriteDocument(path, p, '');
            onCreate(p);
            onOpenChange(false);
            setDocPath('');
        } catch (err) {
            setError(String(err));
        } finally {
            setCreating(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New document</DialogTitle>
                </DialogHeader>
                <Input
                    placeholder="e.g. decisions/0008-my-decision.md"
                    value={docPath}
                    onChange={(e) => setDocPath(e.target.value)}
                    autoFocus
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                    <Button onClick={submit} disabled={creating || !docPath.trim()}>
                        {creating ? 'Creating…' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
