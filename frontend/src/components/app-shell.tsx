import type {CSSProperties, ReactNode} from 'react';
import {Settings} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {LanguageSelect} from '@/components/language-select';

const drag = {'--wails-draggable': 'drag'} as CSSProperties;
const noDrag = {'--wails-draggable': 'no-drag'} as CSSProperties;

export function AppShell({
    children,
    sidebarTop,
    sidebarBody,
    toolbar,
    tabBar,
    onSettingsClick,
}: {
    children: ReactNode;
    /** Rendered at the very top of the sidebar, above the nav list — e.g. the workspace/project switcher. */
    sidebarTop?: ReactNode;
    /** The sidebar's main scrollable body — e.g. the Issues entry and the document tree. */
    sidebarBody?: ReactNode;
    /** Rendered in the content-area toolbar, right-aligned — e.g. Reload. */
    toolbar?: ReactNode;
    /** Rendered as a row of open tabs between the toolbar and the content body. */
    tabBar?: ReactNode;
    /** Called when the sidebar's settings icon is clicked. */
    onSettingsClick?: () => void;
}) {
    const {t} = useTranslation();

    return (
        <div className="app-shell">
            <div className="drag-region" style={drag} />
            <aside className="sidebar-glass">
                <div className="sidebar-glass-draghandle" style={drag} />
                {sidebarTop && <div className="sidebar-project-switcher">{sidebarTop}</div>}
                <nav className="sidebar-nav">{sidebarBody}</nav>
                <div className="flex shrink-0 items-center gap-1 p-2" style={noDrag}>
                    <div className="min-w-0 flex-1">
                        <LanguageSelect />
                    </div>
                    <button
                        onClick={onSettingsClick}
                        aria-label={t('app.settings')}
                        className="flex shrink-0 items-center justify-center rounded-sm p-1.5 text-foreground/80 hover:bg-muted"
                    >
                        <Settings className="size-4" />
                    </button>
                </div>
            </aside>
            <main className="app-content">
                <div className="content-toolbar" style={drag}>
                    <div className="flex-1" />
                    <div style={noDrag}>{toolbar}</div>
                </div>
                {tabBar}
                <div className="content-body">{children}</div>
            </main>
        </div>
    );
}
