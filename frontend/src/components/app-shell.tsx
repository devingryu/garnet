import type {CSSProperties, ReactNode} from 'react';
import {cn} from '@/lib/utils';

const drag = {'--wails-draggable': 'drag'} as CSSProperties;

const NAV_ITEMS = ['Overview', 'Activity', 'Settings'];

export function AppShell({
    children,
    sidebarTop,
    toolbar,
    onSettingsClick,
}: {
    children: ReactNode;
    /** Rendered at the very top of the sidebar, above the nav list — e.g. the workspace/project switcher. */
    sidebarTop?: ReactNode;
    /** Rendered in the content-area toolbar, right-aligned — e.g. Reload. */
    toolbar?: ReactNode;
    /** Called when the "Settings" nav item is clicked. Overview/Activity stay inert placeholders. */
    onSettingsClick?: () => void;
}) {
    return (
        <div className="app-shell">
            <div className="drag-region" style={drag}/>
            <aside className="sidebar-glass">
                <div className="sidebar-glass-draghandle" style={drag}/>
                {sidebarTop && <div className="sidebar-project-switcher">{sidebarTop}</div>}
                <nav className="sidebar-nav">
                    {NAV_ITEMS.map((item, i) => (
                        <div
                            key={item}
                            onClick={item === 'Settings' ? onSettingsClick : undefined}
                            className={cn(
                                'rounded-sm px-2 py-1.5 text-sm select-none',
                                i === 0
                                    ? 'bg-accent text-accent-foreground font-medium'
                                    : 'text-foreground/80 hover:bg-muted',
                                item === 'Settings' ? 'cursor-pointer' : 'cursor-default'
                            )}
                        >
                            {item}
                        </div>
                    ))}
                </nav>
            </aside>
            <main className="app-content">
                <div className="content-toolbar">
                    <div className="flex-1" style={drag}/>
                    {toolbar}
                </div>
                <div className="content-body">{children}</div>
            </main>
        </div>
    );
}
