import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {useAsyncAction} from '@/lib/use-async-action';
import {gitStatusLabel} from '@/lib/git-status';
import {
    GitCommit,
    GitPull,
    GitPush,
    GitStageAll,
    GitStagePaths,
    GitStatus as FetchGitStatus,
} from '../../wailsjs/go/main/App';
import type {GitFileChange, GitStatus} from '@/lib/model';

function FileRow({
    change,
    selected,
    onToggle,
}: {
    change: GitFileChange;
    selected?: boolean;
    onToggle?: () => void;
}) {
    const {t} = useTranslation();
    return (
        <label className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-muted">
            {onToggle ? (
                <input type="checkbox" checked={selected} onChange={onToggle} />
            ) : (
                <span className="w-3.5" />
            )}
            {/* A file path is workspace data, shown as authored (rule 11) —
                only the status word next to it is translated app chrome. */}
            <span className="flex-1 truncate">
                {change.origPath ? `${change.origPath} → ${change.path}` : change.path}
            </span>
            <span className="text-xs text-muted-foreground">
                {gitStatusLabel(t, change.status)}
            </span>
        </label>
    );
}

/** Stage / commit / push / pull against the workspace tree's own git repo
 *  (GARNET-11) — MVP scope: no branch switching, no merge/diff viewer, no
 *  commit log. Not part of Workspace.Open's own data — this fetches and
 *  refreshes independently, the same way DocumentEditorPanel manages its
 *  own read/write round-trips outside the big `mutate`-and-reload flow. */
export function GitPanel({path}: {path: string}) {
    const {t} = useTranslation();
    const {run, error, pending} = useAsyncAction();
    const [status, setStatus] = useState<GitStatus | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState('');

    async function refresh() {
        const result = await run(() => FetchGitStatus(path));
        if (result.ok) setStatus(result.value);
    }

    // Duplicates refresh()'s body rather than calling it directly: this
    // component is remounted with `key={path}` (same as DocumentEditorPanel
    // does per docPath), so there's no stale-workspace race to guard against
    // here — but an effect that calls a same-render function reference which
    // itself calls setState reads to the linter as an unguarded cascade,
    // where the same code inlined in an async IIFE does not.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const result = await run(() => FetchGitStatus(path));
            if (!cancelled && result.ok) setStatus(result.value);
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path]);

    function toggle(filePath: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(filePath)) next.delete(filePath);
            else next.add(filePath);
            return next;
        });
    }

    if (!status && !error) {
        return <p className="text-sm text-muted-foreground">{t('git.loading')}</p>;
    }

    return (
        <div className="flex max-w-2xl flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('git.heading')}</h2>
                {status && (
                    <span className="text-sm text-muted-foreground">
                        {status.branch}
                        {status.hasUpstream &&
                            (status.ahead > 0 || status.behind > 0) &&
                            ` · ${t('git.aheadBehind', {ahead: status.ahead, behind: status.behind})}`}
                    </span>
                )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}

            {status && (
                <>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {t('git.unstaged')}
                            </span>
                            <Button
                                variant="outline"
                                size="xs"
                                disabled={pending || status.unstaged.length === 0}
                                onClick={() =>
                                    void run(() => GitStageAll(path)).then((r) => {
                                        if (r.ok) {
                                            setSelected(new Set());
                                            void refresh();
                                        }
                                    })
                                }
                            >
                                {t('git.stageAll')}
                            </Button>
                        </div>
                        {status.unstaged.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('git.noChanges')}</p>
                        ) : (
                            <div className="flex flex-col rounded-sm border border-border">
                                {status.unstaged.map((change) => (
                                    <FileRow
                                        key={change.path}
                                        change={change}
                                        selected={selected.has(change.path)}
                                        onToggle={() => toggle(change.path)}
                                    />
                                ))}
                            </div>
                        )}
                        <Button
                            variant="outline"
                            size="xs"
                            className="self-end"
                            disabled={pending || selected.size === 0}
                            onClick={() =>
                                void run(() => GitStagePaths(path, [...selected])).then((r) => {
                                    if (r.ok) {
                                        setSelected(new Set());
                                        void refresh();
                                    }
                                })
                            }
                        >
                            {t('git.stageSelected')}
                        </Button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground">{t('git.staged')}</span>
                        {status.staged.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('git.noChanges')}</p>
                        ) : (
                            <div className="flex flex-col rounded-sm border border-border">
                                {status.staged.map((change) => (
                                    <FileRow key={change.path} change={change} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t('git.commitPlaceholder')}
                            className="min-h-16"
                        />
                        <Button
                            size="sm"
                            className="self-end"
                            disabled={pending || !message.trim() || status.staged.length === 0}
                            onClick={() =>
                                void run(() => GitCommit(path, message.trim())).then((r) => {
                                    if (r.ok) {
                                        setMessage('');
                                        void refresh();
                                    }
                                })
                            }
                        >
                            {t('git.commit')}
                        </Button>
                    </div>

                    <div className="flex gap-2 border-t border-border pt-3">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                                void run(() => GitPull(path)).then((r) => {
                                    if (r.ok) void refresh();
                                })
                            }
                        >
                            {t('git.pull')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                                void run(() => GitPush(path)).then((r) => {
                                    if (r.ok) void refresh();
                                })
                            }
                        >
                            {t('git.push')}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
