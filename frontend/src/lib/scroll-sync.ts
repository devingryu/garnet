/** The subset of a scrollable element createScrollSync needs — a plain
 *  interface rather than HTMLElement so the ratio math is testable without a
 *  DOM. */
export interface Scrollable {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
}

function applyRatio(source: Scrollable, target: Scrollable): void {
    const sourceRange = source.scrollHeight - source.clientHeight;
    const targetRange = target.scrollHeight - target.clientHeight;
    if (sourceRange <= 0 || targetRange <= 0) return;
    target.scrollTop = (source.scrollTop / sourceRange) * targetRange;
}

/**
 * VSCode-preview-style split view: scrolling one pane scrolls the other to
 * the same position ratio (their content lengths differ, so this isn't a 1:1
 * scrollTop copy). Setting a's scrollTop fires a's own scroll handler again
 * once the browser dispatches it — `ignoreNext` swallows exactly that
 * follow-up rather than the two sides re-syncing each other forever.
 */
export function createScrollSync() {
    let ignoreNext: 'a' | 'b' | null = null;
    return {
        onScrollA(a: Scrollable, b: Scrollable): void {
            if (ignoreNext === 'a') {
                ignoreNext = null;
                return;
            }
            ignoreNext = 'b';
            applyRatio(a, b);
        },
        onScrollB(a: Scrollable, b: Scrollable): void {
            if (ignoreNext === 'b') {
                ignoreNext = null;
                return;
            }
            ignoreNext = 'a';
            applyRatio(b, a);
        },
    };
}
