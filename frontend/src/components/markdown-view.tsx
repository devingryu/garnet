import Markdown from 'react-markdown';
import type {Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {cn} from '@/lib/utils';
import {resolveMarkdownLink} from '@/lib/markdown-links';

/** Renders markdown read-only, VSCode-preview-style (GARNET-9). Not an
 *  editor — Textarea stays the only way to change the raw text; this is
 *  just another view of it. */
export function MarkdownView({
    content,
    sourceDir,
    onOpenIssue,
    onOpenDocument,
    hideTaskCheckboxes = false,
    className,
}: {
    content: string;
    /** This markdown's containing directory, relative to the workspace root
     *  (e.g. "issues/GRNT-1", or a document's own dirname) — the base a
     *  relative link is resolved against, mirroring resolveLinkTarget. */
    sourceDir: string;
    onOpenIssue: (id: string) => void;
    onOpenDocument: (path: string) => void;
    /** The issue detail panel has its own interactive Todos section fed by
     *  the same "- [ ]" lines (GARNET-13) — showing this view's own
     *  checkbox glyphs there would double them up, so it renders task text
     *  (still struck through when done) with the checkbox itself omitted.
     *  Document rendering has no such section, so it keeps the checkbox. */
    hideTaskCheckboxes?: boolean;
    className?: string;
}) {
    const components: Components = {
        a({href, children, ...props}) {
            if (!href) return <a {...props}>{children}</a>;
            const resolved = resolveMarkdownLink(sourceDir, href);
            if (resolved.kind === 'external') {
                return (
                    <a
                        {...props}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                    >
                        {children}
                    </a>
                );
            }
            if (resolved.kind === 'unresolved') {
                return (
                    <a
                        {...props}
                        href={href}
                        onClick={(e) => e.preventDefault()}
                        className="cursor-default text-muted-foreground no-underline"
                    >
                        {children}
                    </a>
                );
            }
            const target = resolved.kind === 'issue' ? resolved.id : resolved.path;
            const open = resolved.kind === 'issue' ? onOpenIssue : onOpenDocument;
            return (
                <a
                    {...props}
                    href={href}
                    onClick={(e) => {
                        e.preventDefault();
                        open(target);
                    }}
                    className="cursor-pointer text-primary underline"
                >
                    {children}
                </a>
            );
        },
        li({node, className: liClassName, children, ...props}) {
            const checkbox = node?.children.find(
                (c) => c.type === 'element' && c.tagName === 'input'
            );
            const checked = checkbox?.type === 'element' && Boolean(checkbox.properties?.checked);
            if (checkbox && hideTaskCheckboxes) {
                return (
                    <li
                        {...props}
                        className={cn(liClassName, checked && 'text-muted-foreground line-through')}
                    >
                        {children}
                    </li>
                );
            }
            return (
                <li {...props} className={liClassName}>
                    {children}
                </li>
            );
        },
        input({node, ...props}) {
            if (node?.properties?.type === 'checkbox' && hideTaskCheckboxes) return null;
            return <input {...props} disabled className="mt-1 mr-1.5 align-middle" />;
        },
        h1: (p) => <h1 className="mt-4 text-lg font-semibold first:mt-0" {...p} />,
        h2: (p) => <h2 className="mt-4 text-base font-semibold first:mt-0" {...p} />,
        h3: (p) => <h3 className="mt-3 text-sm font-semibold first:mt-0" {...p} />,
        p: (p) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...p} />,
        ul: (p) => <ul className="my-2 list-disc pl-5" {...p} />,
        ol: (p) => <ol className="my-2 list-decimal pl-5" {...p} />,
        blockquote: (p) => (
            <blockquote
                className="my-2 border-l-2 border-border pl-3 text-muted-foreground"
                {...p}
            />
        ),
        hr: (p) => <hr className="my-4 border-border" {...p} />,
        code: (p) => (
            <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-[0.9em]" {...p} />
        ),
        pre: (p) => (
            <pre
                className="my-2 overflow-x-auto rounded-sm bg-muted p-2 font-mono text-[0.9em]"
                {...p}
            />
        ),
    };

    return (
        <div className={cn('text-sm', className)}>
            <Markdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </Markdown>
        </div>
    );
}
