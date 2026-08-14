import type {workspace} from '../../wailsjs/go/models';

// Displaying a person always means resolving their email against the
// project's member registry, never showing the raw address — falls back to
// the email itself if it isn't (or is no longer) a registered member.
export function memberName(project: workspace.Project | undefined, email: string | undefined | null): string {
    if (!email) return '';
    return project?.members.find((m) => m.email === email)?.name ?? email;
}
