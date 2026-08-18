/** Tailwind classes for a status pill, keyed by workflow.md's `category`
 *  (open/active/closed) — not by the status `id`, which is project-declared
 *  free text (GARNET-27). Falls back to the "open" treatment for a category
 *  a project didn't declare as one of the three, same tolerance as an
 *  unrecognized value anywhere else derived from user-edited YAML. */
export function statusCategoryClass(category: string): string {
    switch (category) {
        case 'active':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
        case 'closed':
            return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
        default:
            return 'bg-muted text-muted-foreground';
    }
}
