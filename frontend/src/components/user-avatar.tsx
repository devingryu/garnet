import {useEffect, useState} from 'react';
import {avatarFallback, gravatarUrl} from '@/lib/gravatar';
import {cn} from '@/lib/utils';

/** A person's Gravatar, resolved from their email with no registry lookup
 *  needed (ADR 0009). Falls back to an initial while the hash is resolving
 *  and whenever the email has no Gravatar registered (the image 404s). */
export function UserAvatar({
    email,
    name,
    size = 20,
    className,
}: {
    email: string;
    name: string;
    size?: number;
    className?: string;
}) {
    // Keyed to the (email, size) it was resolved for, so a prop change is
    // never rendered with a stale src — no separate "reset" setState needed
    // in the effect, which is what react-hooks/set-state-in-effect flags.
    const [resolved, setResolved] = useState<{key: string; src: string} | null>(null);
    const [failedKey, setFailedKey] = useState<string | null>(null);
    const key = `${email}:${size}`;

    useEffect(() => {
        if (!email) return;
        let cancelled = false;
        void gravatarUrl(email, size * 2).then((src) => {
            if (!cancelled) setResolved({key, src});
        });
        return () => {
            cancelled = true;
        };
    }, [email, size, key]);

    const style = {width: size, height: size, fontSize: size * 0.55};
    const failed = failedKey === key;
    const src = resolved?.key === key ? resolved.src : null;

    if (!src || failed) {
        return (
            <span
                className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground',
                    className
                )}
                style={style}
                aria-hidden="true"
            >
                {avatarFallback(name, email)}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt=""
            aria-hidden="true"
            className={cn('inline-block shrink-0 rounded-full', className)}
            style={style}
            onError={() => setFailedKey(key)}
        />
    );
}
