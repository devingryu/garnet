import {useState} from 'react';
import type {MouseEvent as ReactMouseEvent} from 'react';
import {cn} from '@/lib/utils';
import {allowedNextStatuses} from '@/lib/workflow';
import type {workspace} from '../../wailsjs/go/models';

interface DragState {
    issue: workspace.Issue;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    width: number;
    moved: boolean;
}

export function IssueBoard({
    project,
    issues,
    onSelect,
    onStatusChange,
}: {
    project: workspace.Project;
    issues: workspace.Issue[];
    onSelect: (id: string) => void;
    onStatusChange: (id: string, status: string) => void;
}) {
    const statuses = project.workflow?.statuses ?? [];
    const [drag, setDrag] = useState<DragState | null>(null);
    const [hoverStatus, setHoverStatus] = useState<string | null>(null);

    if (statuses.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {project.key} has no workflow.md, so there are no status columns to board by.
            </p>
        );
    }

    // Statuses this drag could legally land on — used to highlight valid
    // drop columns as the card moves over them, Jira-style, rather than
    // only finding out a move was invalid after dropping.
    const allowedTargets = drag ? allowedNextStatuses(project.workflow, drag.issue.status).map((s) => s.id) : [];

    function startDrag(e: ReactMouseEvent, issue: workspace.Issue) {
        if (e.button !== 0) return;
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();
        const start: DragState = {
            issue,
            x: e.clientX,
            y: e.clientY,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            width: rect.width,
            moved: false,
        };
        setDrag(start);

        function statusUnderPointer(ev: MouseEvent): string | undefined {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            return el?.closest<HTMLElement>('[data-status-id]')?.dataset.statusId;
        }

        function onMove(ev: MouseEvent) {
            setDrag((prev) => {
                if (!prev) return prev;
                const moved = prev.moved || Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 4;
                return {...prev, x: ev.clientX, y: ev.clientY, moved};
            });
            setHoverStatus(statusUnderPointer(ev) ?? null);
        }

        function onUp(ev: MouseEvent) {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            const targetStatus = statusUnderPointer(ev);

            setDrag((prev) => {
                if (prev && !prev.moved) {
                    onSelect(prev.issue.id);
                } else if (prev && targetStatus && targetStatus !== prev.issue.status) {
                    onStatusChange(prev.issue.id, targetStatus);
                }
                return null;
            });
            setHoverStatus(null);
        }

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    return (
        <div className="flex gap-3 overflow-x-auto">
            {statuses.map((status) => {
                const column = issues.filter((i) => i.status === status.id);
                const isValidTarget = drag != null && allowedTargets.includes(status.id);
                const isHovered = hoverStatus === status.id && drag?.moved;

                return (
                    <div
                        key={status.id}
                        data-status-id={status.id}
                        className={cn(
                            'w-56 shrink-0 rounded-sm p-1 transition-colors',
                            isHovered && isValidTarget && 'bg-accent/60'
                        )}
                    >
                        <h3 className="mb-2 text-sm font-medium">
                            {status.name} <span className="text-muted-foreground">({column.length})</span>
                        </h3>
                        <div className="flex min-h-8 flex-col gap-1.5">
                            {column.map((issue) => (
                                <div
                                    key={issue.id}
                                    onMouseDown={(e) => startDrag(e, issue)}
                                    className={cn(
                                        'cursor-grab rounded-sm border border-border p-2 text-sm select-none hover:bg-muted',
                                        drag?.issue.id === issue.id && drag.moved && 'opacity-30'
                                    )}
                                >
                                    <p className="font-medium">{issue.title || issue.id}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{issue.id} · {issue.type}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {drag && drag.moved && (
                <div
                    className="pointer-events-none fixed z-50 rounded-sm border border-border bg-card p-2 text-sm opacity-80"
                    style={{left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width}}
                >
                    <p className="font-medium">{drag.issue.title || drag.issue.id}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{drag.issue.id} · {drag.issue.type}</p>
                </div>
            )}
        </div>
    );
}
