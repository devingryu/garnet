import type {TFunction} from 'i18next';

/** The link types Garnet offers. The stored value is an identifier that lives
 *  in .garnet.yaml — only its label is translated (AGENTS.md rule 11). */
export const LINK_TYPES = ['blocks', 'relates-to', 'duplicates'] as const;

export type LinkType = (typeof LINK_TYPES)[number];

function isLinkType(value: string): value is LinkType {
    return (LINK_TYPES as readonly string[]).includes(value);
}

/** A hand-edited .garnet.yaml can carry any string, so an unrecognized type
 *  renders as itself rather than vanishing behind a missing-key fallback. */
export function linkTypeLabel(t: TFunction, type: string): string {
    return isLinkType(type) ? t(`issue.linkType.${type}`) : type;
}
