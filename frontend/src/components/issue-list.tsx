import type {workspace} from '../../wailsjs/go/models';

export function IssueList({
    issues,
    onSelect,
}: {
    issues: workspace.Issue[];
    onSelect: (id: string) => void;
}) {
    if (issues.length === 0) {
        return <p className="text-sm text-muted-foreground">No issues yet.</p>;
    }

    return (
        <div className="flex flex-col gap-1">
            {issues.map((issue) => (
                <button
                    key={issue.id}
                    onClick={() => onSelect(issue.id)}
                    className="rounded-sm border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                    <span className="font-medium">{issue.title || issue.id}</span>
                    <span className="ml-2 text-muted-foreground">
                        {issue.id} · {issue.type} · {issue.status || '—'}
                        {issue.assignee && <> · {issue.assignee}</>}
                        {issue.parent && <> · child of {issue.parent}</>}
                    </span>
                </button>
            ))}
        </div>
    );
}
