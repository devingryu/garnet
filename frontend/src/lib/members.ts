import type {Project, User} from '@/lib/model';

// Displaying a person always means resolving their email, never showing
// the raw address. users.yaml (ADR 0009) is workspace-wide and takes
// priority — it's the more specific source, since it covers any actor, not
// just this project's members — falling back to the project's member list,
// then the email itself if neither has heard of it.
export function memberName(
    project: Project | undefined,
    email: string | undefined | null,
    users?: User[]
): string {
    if (!email) return '';
    return (
        users?.find((u) => u.email === email)?.name ??
        project?.members.find((m) => m.email === email)?.name ??
        email
    );
}
