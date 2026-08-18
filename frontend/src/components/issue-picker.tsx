import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';
import type {Issue} from '@/lib/model';

/**
 * A Jira-style searchable issue picker (GARNET-8) — replaces a free-text
 * "type an issue ID" input, which silently produced a dead reference on any
 * typo. `SetIssueParent`/`AddIssueLink` still validate the target exists
 * server-side; this just means a typo is caught before submitting, not
 * instead of validating.
 */
export function IssuePicker({
    issues,
    value,
    onValueChange,
    excludeId,
    placeholder,
}: {
    issues: Issue[];
    /** An issue ID, or "" for none selected. */
    value: string;
    onValueChange: (id: string) => void;
    /** Omit an issue from its own picker — it can't be its own parent or link target. */
    excludeId?: string;
    placeholder?: string;
}) {
    const {t} = useTranslation();
    // Issue titles are workspace data, shown as authored (AGENTS.md rule 11).
    // Memoized so the item objects stay referentially stable across
    // re-renders that don't actually change the issue list — Combobox's
    // default isItemEqualToValue is Object.is, so a fresh array of fresh
    // objects every render would make it lose track of the current
    // selection (and, worse, of what's mid-typing) for no reason.
    const items = useMemo(
        () =>
            issues
                .filter((i) => i.id !== excludeId)
                .map((i) => ({value: i.id, label: i.title ? `${i.id} — ${i.title}` : i.id})),
        [issues, excludeId]
    );

    // See the comment above: looking the selected item back up out of this
    // render's own (now-stable) `items` array keeps the identity Combobox
    // expects, without a custom isItemEqualToValue comparator.
    const selected = items.find((item) => item.value === value) ?? null;

    return (
        <Combobox
            items={items}
            value={selected}
            onValueChange={(item) => onValueChange(item?.value ?? '')}
        >
            <ComboboxInput placeholder={placeholder} showClear />
            {/* ComboboxContent defaults to exactly the anchor's width
                (GARNET-25) — fine for a full-width field, but this picker
                sits in issue-detail-panel.tsx's ~200px metadata column,
                which clamps "GARNET-3 — Add in-app project creation"-length
                labels to unreadable. Widen it independent of the anchor,
                capped by the popup's own available-space var so it still
                fits on screen. IssuePicker is the only Combobox caller in
                the app, so this doesn't touch combobox.tsx's shared
                default for anyone else. */}
            <ComboboxContent className="w-[min(24rem,var(--available-width))]">
                <ComboboxEmpty>{t('issue.pickerEmpty')}</ComboboxEmpty>
                <ComboboxList>
                    {(item) => (
                        <ComboboxItem key={item.value} value={item}>
                            {item.label}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
