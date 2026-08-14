import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import type {workspace} from '../../wailsjs/go/models';

export function NewIssueDialog({
    open,
    onOpenChange,
    project,
    onCreate,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: workspace.Project;
    onCreate: (issueType: string, title: string) => Promise<void>;
}) {
    const [title, setTitle] = useState('');
    const [issueType, setIssueType] = useState(project.issueTypes[0] ?? '');
    const [customType, setCustomType] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasDeclaredTypes = project.issueTypes.length > 0;
    const effectiveType = hasDeclaredTypes ? issueType : customType;

    async function submit() {
        if (!effectiveType.trim() || !title.trim()) return;
        setCreating(true);
        setError(null);
        try {
            await onCreate(effectiveType.trim(), title.trim());
            onOpenChange(false);
            setTitle('');
            setCustomType('');
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
                    <DialogTitle>New issue in {project.key}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <Input
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        autoFocus
                    />
                    {hasDeclaredTypes ? (
                        <Select value={issueType} onValueChange={(v) => setIssueType(v ?? '')}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Type"/>
                            </SelectTrigger>
                            <SelectContent>
                                {project.issueTypes.map((t) => (
                                    <SelectItem key={t} value={t} label={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            placeholder="Type (this project declares none, so any label works)"
                            value={customType}
                            onChange={(e) => setCustomType(e.target.value)}
                        />
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button onClick={submit} disabled={creating || !effectiveType.trim() || !title.trim()}>
                        {creating ? 'Creating…' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
