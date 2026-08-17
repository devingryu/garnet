export type IssuesView = 'board' | 'list';

export type Tab =
    | {kind: 'issues'; projectKey: string; view: IssuesView}
    | {kind: 'issue'; issueId: string}
    | {kind: 'document'; docPath: string}
    | {kind: 'git'};

export function tabKey(tab: Tab): string {
    switch (tab.kind) {
        case 'issues':
            return `issues:${tab.projectKey}`;
        case 'issue':
            return `issue:${tab.issueId}`;
        case 'document':
            return `document:${tab.docPath}`;
        case 'git':
            return 'git';
    }
}

/** Opening something already open focuses it instead of duplicating it. */
export function openTab(tabs: Tab[], tab: Tab): Tab[] {
    const key = tabKey(tab);
    return tabs.some((t) => tabKey(t) === key) ? tabs : [...tabs, tab];
}

export function closeTab(tabs: Tab[], key: string): Tab[] {
    return tabs.filter((t) => tabKey(t) !== key);
}

/**
 * Which tab to focus after closing `key`: the one that slides into its place,
 * else the one before it, else nothing. Only relevant when the closed tab was
 * the active one — callers pass the currently active key so this can say so.
 */
export function nextActiveKey(
    tabs: Tab[],
    closingKey: string,
    activeKey: string | null
): string | null {
    if (activeKey !== closingKey) return activeKey;
    const index = tabs.findIndex((t) => tabKey(t) === closingKey);
    const remaining = closeTab(tabs, closingKey);
    const neighbor = remaining[index] ?? remaining[index - 1] ?? null;
    return neighbor ? tabKey(neighbor) : null;
}

export function setIssuesView(tabs: Tab[], projectKey: string, view: IssuesView): Tab[] {
    return tabs.map((t) => (t.kind === 'issues' && t.projectKey === projectKey ? {...t, view} : t));
}
