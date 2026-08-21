import type {Status, Transition, Workflow} from '@/lib/model';

/** Statuses reachable from currentStatus per the project's workflow.
 *  With no workflow, every declared status (or none) is reachable —
 *  nothing to validate against, so nothing is restricted. */
export function allowedNextStatuses(
    workflow: Workflow | undefined | null,
    currentStatus: string
): Status[] {
    if (!workflow) return [];
    const transition = workflow.transitions.find((t) => t.from === currentStatus);
    if (!transition) return [];
    return workflow.statuses.filter((s) => transition.to.includes(s.id));
}

/** Every status id with at least one transition pointing at it. The entry
 *  point (statuses[0] — see workspace/issue.go's CreateIssue) doesn't need
 *  one, since that's how an issue gets there in the first place. */
function reachableIds(statuses: Status[], transitions: Transition[]): Set<string> {
    const reachable = new Set<string>();
    if (statuses.length > 0) reachable.add(statuses[0].id);
    for (const t of transitions) {
        for (const to of t.to) reachable.add(to);
    }
    return reachable;
}

/** Statuses nothing transitions into, other than the entry point — an
 *  issue can be created directly into any status by hand-editing
 *  .garnet.yaml, but the workflow itself offers no path there, which is
 *  worth surfacing rather than leaving to be noticed as "this column never
 *  fills up." */
export function unreachableStatuses(statuses: Status[], transitions: Transition[]): Status[] {
    const reachable = reachableIds(statuses, transitions);
    return statuses.filter((s) => !reachable.has(s.id));
}

/** Statuses with no outgoing transition — normal for a terminal column
 *  like Done, not a problem to fix, just worth labelling as intentional. */
export function terminalStatuses(statuses: Status[], transitions: Transition[]): Status[] {
    const withOutgoing = new Set(transitions.filter((t) => t.to.length > 0).map((t) => t.from));
    return statuses.filter((s) => !withOutgoing.has(s.id));
}
