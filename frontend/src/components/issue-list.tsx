import {useTranslation} from 'react-i18next';
import {memberName} from '@/lib/members';
import type {Issue, Project} from '@/lib/model';

export function IssueList({
    issues,
    project,
    onSelect,
}: {
    issues: Issue[];
    project: Project;
    onSelect: (id: string) => void;
}) {
    const {t} = useTranslation();

    if (issues.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('issues.empty')}</p>;
    }

    return (
        <div className="flex flex-col gap-1">
            {issues.map((issue) => (
                <button
                    key={issue.id}
                    onClick={() => onSelect(issue.id)}
                    className="rounded-sm border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                    {/* Title, type and status are workspace data, not chrome —
                        they are shown as authored (AGENTS.md rule 11). */}
                    <span className="font-medium">{issue.title || issue.id}</span>
                    <span className="ml-2 text-muted-foreground">
                        {issue.id} · {issue.type} · {issue.status || t('common.empty')}
                        {issue.assignee && <> · {memberName(project, issue.assignee)}</>}
                        {issue.parent && <> · {t('issues.childOf', {parent: issue.parent})}</>}
                    </span>
                </button>
            ))}
        </div>
    );
}
