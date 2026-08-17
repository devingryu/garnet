import type {TFunction} from 'i18next';

/** The file-status words GitFileChange.status can carry (workspace/git.go's
 *  statusLabel) — translated app chrome, not workspace data (rule 11). */
const GIT_STATUSES = [
    'added',
    'modified',
    'deleted',
    'renamed',
    'copied',
    'conflicted',
    'untracked',
] as const;

type GitFileStatus = (typeof GIT_STATUSES)[number];

function isGitFileStatus(value: string): value is GitFileStatus {
    return (GIT_STATUSES as readonly string[]).includes(value);
}

/** Falls back to the raw value for anything unrecognized, same reasoning as
 *  linkTypeLabel/priorityLabel — this crosses a process boundary (git's own
 *  output, reshaped by the Go side), so treating an unknown status as fatal
 *  would be one parsing quirk away from a blank screen. */
export function gitStatusLabel(t: TFunction, status: string): string {
    return isGitFileStatus(status) ? t(`git.status.${status}`) : status;
}
