import type {TFunction} from 'i18next';
import en from '@/locales/en/translation.json';

/** The wire form of a workspace.CodedError. Wails transports errors as plain
 *  strings, so the Go side packs the code and its params into JSON — see
 *  workspace/errors.go. */
interface ErrorEnvelope {
    garnet: number;
    code: string;
    params?: Record<string, string>;
    message: string;
}

type ErrorCode = Exclude<keyof typeof en.errors, 'unknown'>;

function isErrorCode(code: string): code is ErrorCode {
    return code !== 'unknown' && code in en.errors;
}

/** Wails rejects with a bare string; anything else reaching here is a
 *  frontend exception. */
function rawMessage(err: unknown): string {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    return String(err);
}

function decode(err: unknown): ErrorEnvelope | null {
    const raw = rawMessage(err);
    if (!raw.startsWith('{')) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<ErrorEnvelope>;
        if (parsed.garnet !== 1 || typeof parsed.code !== 'string') return null;
        return {
            garnet: parsed.garnet,
            code: parsed.code,
            params: parsed.params,
            message: typeof parsed.message === 'string' ? parsed.message : raw,
        };
    } catch {
        return null;
    }
}

/**
 * Turns whatever the Go side rejected with into text a person can read. A
 * coded error becomes its translated message; anything else — unexpected I/O,
 * a code this build has no string for — falls back to the generic message
 * with the raw text as detail, so nothing is silently swallowed.
 */
export function errorMessage(t: TFunction, err: unknown): string {
    const envelope = decode(err);
    if (envelope && isErrorCode(envelope.code)) {
        // i18next types t()'s placeholders per key, but which error arrives is
        // only known at runtime, so this one call opts out of that check. The
        // key itself is still validated — by isErrorCode here, and by
        // TestErrorCodeInventory on the Go side.
        const translate = t as unknown as (key: string, params?: Record<string, string>) => string;
        return translate(`errors.${envelope.code}`, envelope.params);
    }
    return t('errors.unknown', {detail: envelope?.message ?? rawMessage(err)});
}
