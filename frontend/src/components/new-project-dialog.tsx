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
import {CreateProject} from '../../wailsjs/go/main/App';

export function NewProjectDialog({
    path,
    open,
    onOpenChange,
    onCreated,
}: {
    path: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Hands the new project's key back so the caller can switch to it. */
    onCreated: (projectKey: string) => void;
}) {
    const {t} = useTranslation();
    const {run, error, pending} = useAsyncAction();
    const [key, setKey] = useState('');
    const [name, setName] = useState('');

    async function submit() {
        if (!key.trim() || !name.trim()) return;
        const result = await run(() => CreateProject(path, key.trim(), name.trim()));
        if (!result.ok) return;
        onCreated(result.value.key);
        onOpenChange(false);
        setKey('');
        setName('');
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('project.newHeading')}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <Input
                        placeholder={t('project.keyPlaceholder')}
                        value={key}
                        // Jira-style: uppercase as you type, and strip anything
                        // the backend wouldn't accept anyway (project.go's
                        // projectKeyRE) — cheaper to prevent than to round-trip
                        // an error for a stray space or hyphen.
                        onChange={(e) =>
                            setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))
                        }
                        autoFocus
                    />
                    <Input
                        placeholder={t('project.namePlaceholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => void submit()}
                        disabled={pending || !key.trim() || !name.trim()}
                    >
                        {pending ? t('project.creating') : t('project.create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
