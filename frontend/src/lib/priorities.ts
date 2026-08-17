import type {TFunction} from 'i18next';

/** The fixed, workspace-wide priority scale (GARNET-14) — highest first, the
 *  order a picker or a sort should use. Unlike issue types, this doesn't vary
 *  by project, so there's nothing to declare in project.md. The stored value
 *  is an identifier that lives in .garnet.yaml — only its label is
 *  translated (AGENTS.md rule 11). */
export const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'] as const;

export type Priority = (typeof PRIORITIES)[number];

function isPriority(value: string): value is Priority {
    return (PRIORITIES as readonly string[]).includes(value);
}

/** A hand-edited .garnet.yaml can carry any string, so an unrecognized value
 *  renders as itself rather than vanishing behind a missing-key fallback. */
export function priorityLabel(t: TFunction, priority: string): string {
    return isPriority(priority) ? t(`issue.priorityLevel.${priority}`) : priority;
}
