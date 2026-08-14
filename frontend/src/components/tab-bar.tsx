import {X} from 'lucide-react';
import {cn} from '@/lib/utils';

export function TabBar({
    items,
    activeKey,
    onSelect,
    onClose,
}: {
    items: {key: string; label: string}[];
    activeKey: string | null;
    onSelect: (key: string) => void;
    onClose: (key: string) => void;
}) {
    return (
        <div className="tab-bar">
            {items.map((item) => {
                const active = item.key === activeKey;
                return (
                    <div
                        key={item.key}
                        onClick={() => onSelect(item.key)}
                        className={cn(
                            'flex shrink-0 cursor-default items-center gap-1.5 border-b-2 border-transparent px-3 py-1.5 text-sm select-none',
                            active
                                ? 'border-primary font-medium text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <span className="max-w-40 truncate">{item.label}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose(item.key);
                            }}
                            aria-label={`Close ${item.label}`}
                            className="rounded-sm p-0.5 hover:bg-muted"
                        >
                            <X className="size-3"/>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
