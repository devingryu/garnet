import type {CSSProperties, ReactNode} from 'react';
import {cn} from '@/lib/utils';

const drag = {'--wails-draggable': 'drag'} as CSSProperties;

const NAV_ITEMS = ['Overview', 'Activity', 'Settings'];

export function AppShell({children}: {children: ReactNode}) {
    return (
        <div className="app-shell">
            <div className="drag-region" style={drag}/>
            <aside className="sidebar-glass">
                <div className="sidebar-glass-draghandle" style={drag}/>
                <nav className="sidebar-nav">
                    {NAV_ITEMS.map((item, i) => (
                        <div
                            key={item}
                            className={cn(
                                'rounded-sm px-2 py-1.5 text-sm select-none cursor-default',
                                i === 0
                                    ? 'bg-accent text-accent-foreground font-medium'
                                    : 'text-foreground/80 hover:bg-muted'
                            )}
                        >
                            {item}
                        </div>
                    ))}
                </nav>
            </aside>
            <main className="app-content">{children}</main>
        </div>
    );
}
