export type Tab =
    | {kind: 'issues'; projectKey: string; view: 'board' | 'list'}
    | {kind: 'issue'; issueId: string}
    | {kind: 'document'; docPath: string};

export function tabKey(tab: Tab): string {
    switch (tab.kind) {
        case 'issues':
            return `issues:${tab.projectKey}`;
        case 'issue':
            return `issue:${tab.issueId}`;
        case 'document':
            return `document:${tab.docPath}`;
    }
}
