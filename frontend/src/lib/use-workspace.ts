import {useCallback, useRef, useState} from 'react';
import {OpenWorkspace} from '../../wailsjs/go/main/App';
import type {LoadedWorkspace} from '@/lib/model';
import {useAsyncAction} from '@/lib/use-async-action';

/**
 * Owns the loaded workspace and every write against it.
 *
 * Writes always re-read the tree from disk rather than merging the returned
 * value into local state. Backlinks are derived by workspace.Open and by
 * nothing else, so a hand-merged cache silently goes stale the moment a
 * markdown link changes — that is AGENTS.md rule 2, and it was a real bug. A
 * re-read costs one tree walk over a local checkout, which is a fair price
 * for the whole class of drift it removes.
 */
export function useWorkspace() {
    const [loaded, setLoaded] = useState<LoadedWorkspace | null>(null);
    const {run, error, setError, pending} = useAsyncAction();
    // A write re-reads the workspace it was issued against, which is not
    // necessarily whatever is in state when it lands.
    const pathRef = useRef<string | null>(null);

    /** Resolves to the freshly read workspace, or null if the read failed —
     *  callers that need to act on its contents (picking a default project,
     *  say) get them without waiting for a re-render. */
    const load = useCallback(
        async (path: string) => {
            const result = await run(() => OpenWorkspace(path));
            if (!result.ok) return null;
            pathRef.current = path;
            setLoaded({path, data: result.value});
            return result.value;
        },
        [run]
    );

    const reload = useCallback(async () => {
        const path = pathRef.current;
        if (path === null) return null;
        return load(path);
    }, [load]);

    const mutate = useCallback(
        async (action: (path: string) => Promise<unknown>) => {
            const path = pathRef.current;
            if (path === null) return false;
            const result = await run(() => action(path));
            if (!result.ok) return false;
            await reload();
            return true;
        },
        [run, reload]
    );

    return {loaded, load, reload, mutate, run, error, setError, pending};
}
