import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {useAsyncAction} from '@/lib/use-async-action';
import {
    AddProfile,
    GetIdentity,
    ListProfiles,
    RemoveProfile,
    SetActiveProfile,
} from '../../wailsjs/go/main/App';
import type {Identity, Profile} from '@/lib/model';

/** Profiles (GARNET-6) — app-level, not per-project, which is why this is
 *  its own dialog rather than a section of ProjectSettingsDialog. The same
 *  saved profile list shows up no matter which workspace is open; only
 *  which one is *active* is per-workspace. */
export function UserSettingsDialog({
    path,
    open,
    onOpenChange,
    onActiveProfileChanged,
}: {
    path: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Runs after the active profile changes, so the rest of the app (the
     *  reporter a new issue would get, etc.) reflects it immediately. */
    onActiveProfileChanged: (identity: Identity | null) => void;
}) {
    const {t} = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('userSettings.heading')}</DialogTitle>
                </DialogHeader>
                {/* Keyed on `open` so every reopen starts from what's
                    actually on disk (AGENTS.md rule 6), the same pattern
                    ProjectSettingsDialog uses for its own form. */}
                {open && (
                    <ProfilesPanel
                        key={path}
                        path={path}
                        onActiveProfileChanged={onActiveProfileChanged}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function ProfilesPanel({
    path,
    onActiveProfileChanged,
}: {
    path: string;
    onActiveProfileChanged: (identity: Identity | null) => void;
}) {
    const {t} = useTranslation();
    const {run, error, pending} = useAsyncAction();
    const [profiles, setProfiles] = useState<Profile[] | null>(null);
    const [activeEmail, setActiveEmail] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    async function refresh() {
        const listResult = await run(() => ListProfiles());
        if (listResult.ok) setProfiles(listResult.value);
        const identityResult = await run(() => GetIdentity(path));
        if (identityResult.ok) {
            setActiveEmail(identityResult.value?.email ?? '');
            onActiveProfileChanged(identityResult.value ?? null);
        }
    }

    // Duplicates refresh()'s body rather than calling it directly: this
    // panel remounts via `key={path}` on the dialog whenever it reopens
    // (AGENTS.md rule 6), so there's no stale-data race to guard against —
    // but an effect that calls a same-render function reference which
    // itself calls setState reads to the linter as an unguarded cascade,
    // where the same code inlined here does not.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const listResult = await run(() => ListProfiles());
            if (!cancelled && listResult.ok) setProfiles(listResult.value);
            const identityResult = await run(() => GetIdentity(path));
            if (!cancelled && identityResult.ok) {
                setActiveEmail(identityResult.value?.email ?? '');
                onActiveProfileChanged(identityResult.value ?? null);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col gap-3">
            {profiles === null ? (
                <p className="text-sm text-muted-foreground">{t('document.loading')}</p>
            ) : (
                <div className="flex flex-col gap-1">
                    {profiles.map((p) => (
                        <label
                            key={p.email}
                            className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-muted"
                        >
                            <input
                                type="radio"
                                name="active-profile"
                                checked={p.email === activeEmail}
                                onChange={() =>
                                    void run(() => SetActiveProfile(path, p.email)).then((r) => {
                                        if (r.ok) void refresh();
                                    })
                                }
                            />
                            {/* Name/email are the user's own content, shown as
                                authored (rule 11). */}
                            <span className="flex-1">
                                {p.name} <span className="text-muted-foreground">{p.email}</span>
                            </span>
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={t('common.remove', {name: p.name})}
                                disabled={pending}
                                onClick={() =>
                                    void run(() => RemoveProfile(p.email)).then((r) => {
                                        if (r.ok) void refresh();
                                    })
                                }
                            >
                                ×
                            </Button>
                        </label>
                    ))}
                    {profiles.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            {t('userSettings.noProfiles')}
                        </p>
                    )}
                </div>
            )}

            <div className="flex gap-1.5 border-t border-border pt-3">
                <Input
                    placeholder={t('member.name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <Input
                    placeholder={t('member.email')}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                    variant="outline"
                    size="sm"
                    disabled={pending || !name.trim() || !email.trim()}
                    onClick={() =>
                        void run(() => AddProfile(name.trim(), email.trim())).then((r) => {
                            if (r.ok) {
                                setName('');
                                setEmail('');
                                void refresh();
                            }
                        })
                    }
                >
                    {t('userSettings.addProfile')}
                </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
