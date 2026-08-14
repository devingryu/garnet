import type {workspace} from '../../wailsjs/go/models';

/** Statuses reachable from currentStatus per the project's workflow.
 *  With no workflow, every declared status (or none) is reachable —
 *  nothing to validate against, so nothing is restricted. */
export function allowedNextStatuses(
    workflow: workspace.Workflow | undefined,
    currentStatus: string
): workspace.Status[] {
    if (!workflow) return [];
    const transition = workflow.transitions.find((t) => t.from === currentStatus);
    if (!transition) return [];
    return workflow.statuses.filter((s) => transition.to.includes(s.id));
}
