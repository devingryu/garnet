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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {useAsyncAction} from '@/lib/use-async-action';
import {CreateIssue} from '../../wailsjs/go/main/App';
import type {Project} from '@/lib/model';

export function NewIssueDialog({
    path,
    open,
    onOpenChange,
    project,
    onCreated,
}: {
    path: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project;
    /** Hands the new issue's ID back so the caller can re-read and focus it. */
    onCreated: (issueId: string) => void;
}) {
    const {t} = useTranslation();
    const {run, error, pending} = useAsyncAction();
    const [title, setTitle] = useState('');
    const [issueType, setIssueType] = useState(project.issueTypes[0] ?? '');
    const [customType, setCustomType] = useState('');

    const hasDeclaredTypes = project.issueTypes.length > 0;
    const effectiveType = hasDeclaredTypes ? issueType : customType;

    async function submit() {
        if (!effectiveType.trim() || !title.trim()) return;
        const result = await run(() =>
            CreateIssue(path, project.key, effectiveType.trim(), title.trim())
        );
        if (!result.ok) return;
        onCreated(result.value.id);
        onOpenChange(false);
        setTitle('');
        setCustomType('');
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('newIssue.heading', {project: project.key})}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <Input
                        placeholder={t('newIssue.titlePlaceholder')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        autoFocus
                    />
                    {hasDeclaredTypes ? (
                        // Issue types are declared per project — workspace data,
                        // shown as authored (AGENTS.md rule 11).
                        <Select
                            items={project.issueTypes.map((type) => ({value: type, label: type}))}
                            value={issueType}
                            onValueChange={(v) => setIssueType(v == null ? '' : String(v))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('newIssue.typePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                {project.issueTypes.map((type) => (
                                    <SelectItem key={type} value={type} label={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            placeholder={t('newIssue.customTypePlaceholder')}
                            value={customType}
                            onChange={(e) => setCustomType(e.target.value)}
                        />
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => void submit()}
                        disabled={pending || !effectiveType.trim() || !title.trim()}
                    >
                        {pending ? t('newIssue.creating') : t('newIssue.create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
