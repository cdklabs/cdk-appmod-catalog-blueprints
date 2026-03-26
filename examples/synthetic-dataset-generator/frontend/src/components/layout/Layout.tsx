import { useState, ReactNode } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { Sidebar } from './Sidebar';
import { MobileNav, MobileTab } from './MobileNav';
import { ExportButton } from '@/components/data/ExportButton';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface LayoutProps {
  chatPanel: ReactNode;
  schemaPanel: ReactNode;
  previewPanel: ReactNode;
  user?: string;
  onSignOut?: () => void;
}

export function Layout({ chatPanel, schemaPanel, previewPanel, user, onSignOut }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>('chat');
  const { downloads } = useChat();

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between gap-3 p-4 border-b border-border lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-surface rounded-lg"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <span className="font-semibold text-foreground">DataSynth</span>
          </div>
          <div className="flex items-center gap-2">
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-2 hover:bg-surface rounded-lg text-muted"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Desktop layout with horizontal resizing */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          <Group orientation="horizontal" id="datasynth-main" className="w-full">
            {/* Chat panel - resizable */}
            <Panel defaultSize="50%" minSize="25%">
              <div className="h-full flex flex-col overflow-hidden">
                {chatPanel}
              </div>
            </Panel>

            {/* Horizontal resize handle */}
            <Separator className="w-2 bg-border hover:bg-primary/50 transition-colors cursor-col-resize flex items-center justify-center group">
              <div className="h-12 w-1 rounded-full bg-muted group-hover:bg-primary transition-colors" />
            </Separator>

            {/* Right panels container - resizable */}
            <Panel defaultSize="50%" minSize="25%">
              <div className="h-full flex flex-col overflow-hidden border-l border-border">
                {/* Data panels header with Export button and user info */}
                <div className="flex items-center justify-between px-4 py-3 bg-sidebar border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Generated Data</h2>
                  <div className="flex items-center gap-3">
                    <ExportButton downloads={downloads} />
                    {user && (
                      <span className="text-sm text-muted">{user}</span>
                    )}
                    {onSignOut && (
                      <button
                        onClick={onSignOut}
                        className="p-2 hover:bg-surface rounded-lg text-muted"
                        title="Sign out"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Resizable Schema and Preview panels */}
                <div className="flex flex-1 overflow-hidden">
                  <Group orientation="vertical" id="datasynth-panels" className="w-full">
                    {/* Schema panel */}
                    <Panel defaultSize="40%" minSize="15%">
                      <div className="h-full flex flex-col overflow-hidden">
                        {schemaPanel}
                      </div>
                    </Panel>

                    {/* Vertical resize handle */}
                    <Separator className="h-2 bg-border hover:bg-primary/50 transition-colors cursor-row-resize flex items-center justify-center group">
                      <div className="w-12 h-1 rounded-full bg-muted group-hover:bg-primary transition-colors" />
                    </Separator>

                    {/* Preview panel */}
                    <Panel defaultSize="60%" minSize="15%">
                      <div className="h-full flex flex-col overflow-hidden border-t border-border">
                        {previewPanel}
                      </div>
                    </Panel>
                  </Group>
                </div>
              </div>
            </Panel>
          </Group>
        </div>

        {/* Mobile layout - non-resizable, tab-based */}
        <div className="flex-1 flex flex-col overflow-hidden lg:hidden">
          {/* Chat panel on mobile */}
          <div className={cn('flex-1 flex flex-col overflow-hidden', activeTab !== 'chat' && 'hidden')}>
            {chatPanel}
          </div>
          {/* Schema panel on mobile */}
          <div className={cn('flex-1 flex flex-col overflow-hidden', activeTab !== 'schema' && 'hidden')}>
            {schemaPanel}
          </div>
          {/* Preview panel on mobile */}
          <div className={cn('flex-1 flex flex-col overflow-hidden', activeTab !== 'preview' && 'hidden')}>
            {previewPanel}
          </div>
        </div>

        {/* Mobile bottom nav - adds padding to prevent content overlap */}
        <div className="h-16 lg:hidden" />
      </div>

      {/* Mobile tab navigation */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
