import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {OpenWorkspace, SelectWorkspaceFolder} from '../../wailsjs/go/main/App';
import type {workspace} from '../../wailsjs/go/models';

export function WorkspaceView() {
    const [path, setPath] = useState<string | null>(null);
    const [ws, setWs] = useState<workspace.Workspace | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function load(targetPath: string) {
        setLoading(true);
        setError(null);
        try {
            const result = await OpenWorkspace(targetPath);
            setPath(targetPath);
            setWs(result);
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }

    async function openWorkspace() {
        const selected = await SelectWorkspaceFolder();
        if (!selected) return; // user cancelled
        await load(selected);
    }

    if (!ws) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-muted-foreground">
                    {error ?? 'Open a directory containing projects/ or issues/ to get started.'}
                </p>
                <Button onClick={openWorkspace} disabled={loading}>
                    {loading ? 'Opening…' : 'Open Workspace'}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-muted-foreground">{ws.root}</p>
                <Button variant="outline" size="sm" onClick={() => path && load(path)} disabled={loading}>
                    {loading ? 'Reloading…' : 'Reload'}
                </Button>
            </div>

            {ws.warnings.length > 0 && (
                <div className="rounded-sm border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                        {ws.warnings.length} item{ws.warnings.length === 1 ? '' : 's'} failed to load
                    </p>
                    <ul className="mt-1 list-disc pl-4">
                        {ws.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                        ))}
                    </ul>
                </div>
            )}

            <section>
                <h2 className="mb-2 text-sm font-medium">Projects ({ws.projects.length})</h2>
                <div className="flex flex-col gap-1">
                    {ws.projects.map((p) => (
                        <div key={p.key} className="rounded-sm border border-border px-3 py-2 text-sm">
                            <span className="font-medium">{p.key}</span> — {p.name}
                            <span className="ml-2 text-muted-foreground">
                                {p.issueTypes.join(', ')} · {p.repos.length} repo{p.repos.length === 1 ? '' : 's'}
                            </span>
                        </div>
                    ))}
                    {ws.projects.length === 0 && (
                        <p className="text-sm text-muted-foreground">No projects yet.</p>
                    )}
                </div>
            </section>

            <section>
                <h2 className="mb-2 text-sm font-medium">Issues ({ws.issues.length})</h2>
                <div className="flex flex-col gap-1">
                    {ws.issues.map((i) => (
                        <div key={i.id} className="rounded-sm border border-border px-3 py-2 text-sm">
                            <span className="font-medium">{i.id}</span>
                            <span className="ml-2 text-muted-foreground">
                                {i.type} · {i.status}
                                {i.parent && <> · child of {i.parent}</>}
                            </span>
                        </div>
                    ))}
                    {ws.issues.length === 0 && (
                        <p className="text-sm text-muted-foreground">No issues yet.</p>
                    )}
                </div>
            </section>
        </div>
    );
}
