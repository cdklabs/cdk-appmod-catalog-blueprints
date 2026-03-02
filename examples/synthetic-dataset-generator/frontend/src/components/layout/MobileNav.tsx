import { MessageSquare, Table2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileTab = 'chat' | 'schema' | 'preview';

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'schema' as const, label: 'Schema', icon: Table2 },
    { id: 'preview' as const, label: 'Preview', icon: Eye },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border lg:hidden z-30">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
              activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
