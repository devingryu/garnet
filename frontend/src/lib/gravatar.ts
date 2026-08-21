// Gravatar accepts a SHA-256 hash of a lowercased, trimmed email — no
// registry entry needed, which is why ADR 0009 leaves avatar out of
// users.yaml entirely. Web Crypto's digest is async, so callers render a
// fallback until the hash resolves.
async function sha256Hex(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/** size is Gravatar's `s` param, in pixels. d=404 makes an unregistered
 *  email 404 instead of returning Gravatar's default placeholder image, so
 *  callers can fall back to their own (e.g. initials). */
export async function gravatarUrl(email: string, size: number): Promise<string> {
    const hash = await sha256Hex(email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

/** The initial(s) to show while a Gravatar hasn't resolved (or 404s): the
 *  first letter of a resolved display name, falling back to the email's
 *  local part. */
export function avatarFallback(name: string, email: string): string {
    const source = name.trim() || email.trim();
    return source ? source[0].toUpperCase() : '';
}
