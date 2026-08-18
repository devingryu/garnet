import {Bookmark, Milestone, SquareCheck, Bug, Circle} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

/** Icon per declared issue type (GARNET-27). Type is project-declared free
 *  text (`project.md`'s `issue-types`), not a fixed enum, so this can only
 *  cover the common v1 set — an undeclared/custom type falls back to a
 *  plain circle rather than nothing. */
const ICONS: Record<string, LucideIcon> = {
    epic: Bookmark,
    milestone: Milestone,
    task: SquareCheck,
    bug: Bug,
};

export function issueTypeIcon(type: string): LucideIcon {
    return ICONS[type] ?? Circle;
}
