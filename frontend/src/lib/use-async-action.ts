import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {errorMessage} from '@/lib/errors';

/** Explicit success/failure rather than `T | undefined`, so a call that
 *  legitimately resolves to undefined (the void-returning writes) isn't
 *  mistaken for a failure. */
export type ActionResult<T> = {ok: true; value: T} | {ok: false; message: string};

/**
 * The single path a component takes to call the Go backend (AGENTS.md rule 7):
 * it holds the pending flag, and it turns a rejection into a translated
 * message instead of leaking the Go error string into the UI.
 */
export function useAsyncAction() {
    const {t} = useTranslation();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const run = useCallback(
        async <T>(action: () => Promise<T>): Promise<ActionResult<T>> => {
            setError(null);
            setPending(true);
            try {
                return {ok: true, value: await action()};
            } catch (err) {
                const message = errorMessage(t, err);
                setError(message);
                return {ok: false, message};
            } finally {
                setPending(false);
            }
        },
        [t]
    );

    return {run, error, setError, pending};
}
