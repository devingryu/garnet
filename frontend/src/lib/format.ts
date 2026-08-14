/**
 * Timeline timestamps arrive as RFC 3339 strings, though Wails types the
 * field as `any` (Go's time.Time has no TS equivalent). Formatting goes
 * through Intl with the active language rather than the host default, so the
 * date reads the same way as the rest of the UI (AGENTS.md rule 10).
 */
export function formatTimestamp(value: unknown, language: string): string {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(language, {dateStyle: 'medium', timeStyle: 'short'}).format(
        date
    );
}
