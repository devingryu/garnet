import {describe, expect, test} from 'bun:test';
import {createScrollSync, type Scrollable} from '@/lib/scroll-sync';

function pane(scrollTop: number, scrollHeight: number, clientHeight = 100): Scrollable {
    return {scrollTop, scrollHeight, clientHeight};
}

describe('createScrollSync', () => {
    test('scrolls the other pane to the same position ratio, not the same scrollTop', () => {
        const sync = createScrollSync();
        const a = pane(100, 600); // 100/(600-100) = 20% through
        const b = pane(0, 1100); // range 1000

        sync.onScrollA(a, b);

        expect(b.scrollTop).toBeCloseTo(200); // 20% of 1000
    });

    test("a programmatic scroll's own follow-up event is swallowed, not re-synced", () => {
        const sync = createScrollSync();
        const a = pane(100, 600);
        const b = pane(0, 1100);

        sync.onScrollA(a, b); // b.scrollTop becomes 200
        // The browser now fires b's own scroll event for that programmatic
        // change — onScrollB sees b.scrollTop=200, which would otherwise
        // recompute and stomp a.scrollTop right back.
        sync.onScrollB(a, b);

        expect(a.scrollTop).toBe(100);
    });

    test('a real, separate scroll on b after that still syncs a normally', () => {
        const sync = createScrollSync();
        const a = pane(100, 600);
        const b = pane(0, 1100);

        sync.onScrollA(a, b);
        sync.onScrollB(a, b); // swallowed, as above

        b.scrollTop = 550; // an actual user scroll on b: 55% through
        sync.onScrollB(a, b);

        expect(a.scrollTop).toBeCloseTo(275); // 55% of (600-100)
    });

    test('does nothing when a pane has no scrollable range (nothing to overflow)', () => {
        const sync = createScrollSync();
        const a = pane(0, 80, 100); // shorter than its own viewport
        const b = pane(0, 1100);

        sync.onScrollA(a, b);

        expect(b.scrollTop).toBe(0);
    });
});
