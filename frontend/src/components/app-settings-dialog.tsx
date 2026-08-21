import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {LanguageSelect} from '@/components/language-select';
import {UserAvatar} from '@/components/user-avatar';
import {useAsyncAction} from '@/lib/use-async-action';
import {
    AddProfile,
    AddUser,
    GetIdentity,
    ListProfiles,
    RemoveProfile,
    RemoveUser,
    SetActiveProfile,
} from '../../wailsjs/go/main/App';
import type {Identity, Profile, User} from '@/lib/model';

type Section = 'general' | 'profiles' | 'people';
const SECTIONS: Section[] = ['general', 'profiles', 'people'];

/**
 * App settings (GARNET-26) — everything scoped to this person/machine, not
 * this project: language (General), Profiles (GARNET-6, "who could I
 * be"), and People (GARNET-16's users.yaml, the workspace-shared display
 * registry for any actor). One dialog, three sections with different
 * scope and data — General and Profiles are app-level, People is
 * workspace-level but has nowhere else to live yet.
 */
export function AppSettingsDialog({
    path,
    open,
    onOpenChange,
    onActiveProfileChanged,
    users,
    onUsersChanged,
}: {
    path: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Runs after the active profile changes, so the rest of the app (the
     *  reporter a new issue would get, etc.) reflects it immediately. */
    onActiveProfileChanged: (identity: Identity | null) => void;
    /** The workspace's current users.yaml registry (part of the loaded
     *  workspace — AGENTS.md rule 2, no separate fetch to go stale). */
    users: User[];
    /** Runs after a People-section write, to re-read the workspace. */
    onUsersChanged: () => void;
}) {
    const {t} = useTranslation();
    const [section, setSection] = useState<Section>('general');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('appSettings.heading')}</DialogTitle>
                </DialogHeader>

                <div className="flex gap-1 border-b border-border pb-2">
                    {SECTIONS.map((s) => (
                        <Button
                            key={s}
                            variant={s === section ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setSection(s)}
                        >
                            {t(`appSettings.section.${s}`)}
                        </Button>
                    ))}
                </div>

                {section === 'general' && (
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{t('app.language')}</span>
                        <LanguageSelect />
                    </div>
                )}

                {/* Keyed on `open` so every reopen starts from what's
                    actually on disk (AGENTS.md rule 6), the same pattern
                    ProjectSettingsDialog uses for its own form. */}
                {open && section === 'profiles' && (
                    <ProfilesPanel
                        key={path}
                        path={path}
                        onActiveProfileChanged={onActiveProfileChanged}
                    />
                )}
                {open && section === 'people' && (
                    <PeoplePanel key={path} path={path} users={users} onChanged={onUsersChanged} />
                )}
            </DialogContent>
        </Dialog>
    );
}

function PeoplePanel({
    path,
    users,
    onChanged,
}: {
    path: string;
    users: User[];
    onChanged: () => void;
}) {
    const {t} = useTranslation();
    const {run, error, pending} = useAsyncAction();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
                {users.map((u) => (
                    <div
                        key={u.email}
                        className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-muted"
                    >
                        <UserAvatar email={u.email} name={u.name} />
                        {/* Name/email are the user's own content, shown as
                            authored (rule 11). */}
                        <span className="flex-1">
                            {u.name} <span className="text-muted-foreground">{u.email}</span>
                        </span>
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t('common.remove', {name: u.name})}
                            disabled={pending}
                            onClick={() =>
                                void run(() => RemoveUser(path, u.email)).then((r) => {
                                    if (r.ok) onChanged();
                                })
                            }
                        >
                            ×
                        </Button>
                    </div>
                ))}
                {users.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('userSettings.noUsers')}</p>
                )}
            </div>

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
                        void run(() => AddUser(path, email.trim(), name.trim())).then((r) => {
                            if (r.ok) {
                                setName('');
                                setEmail('');
                                onChanged();
                            }
                        })
                    }
                >
                    {t('userSettings.addUser')}
                </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
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
