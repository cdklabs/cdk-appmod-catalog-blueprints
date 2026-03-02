import { useState, ReactNode } from 'react';
import { Menu, LogOut, PlusCircle } from 'lucide-react';
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
  const { downloads, isStreaming, newChat } = useChat();

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
            <button
              onClick={newChat}
              className="p-2 hover:bg-surface rounded-lg text-accent"
              title="New chat"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
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

        {/* Desktop layout: Chat (50%) | Right panels (50%) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Chat panel - 50% on desktop, full on mobile */}
          <div
            className={cn(
              'flex-1 lg:flex-none lg:w-1/2 flex flex-col overflow-hidden',
              activeTab !== 'chat' && 'hidden lg:flex'
            )}
          >
            {chatPanel}
          </div>

          {/* Right panels container - 50% on desktop */}
          <div className="lg:flex-1 flex flex-col overflow-hidden lg:border-l border-border">
            {/* Data panels header with Export button and user info */}
            <div className="hidden lg:flex items-center justify-between px-4 py-3 bg-sidebar border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Generated Data</h2>
              <div className="flex items-center gap-3">
                <ExportButton downloads={downloads} disabled={!downloads || isStreaming} />
                <button
                  onClick={newChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent hover:bg-surface rounded-lg transition-colors"
                  title="Start new chat"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>New Chat</span>
                </button>
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

            {/* Schema panel - 40% of right side on desktop */}
            <div
              className={cn(
                'lg:h-[40%] flex flex-col overflow-hidden border-t lg:border-t-0',
                activeTab !== 'schema' && 'hidden lg:flex'
              )}
            >
              {schemaPanel}
            </div>

            {/* Preview panel - 60% of right side on desktop */}
            <div
              className={cn(
                'lg:h-[60%] flex flex-col overflow-hidden border-t border-border',
                activeTab !== 'preview' && 'hidden lg:flex'
              )}
            >
              {previewPanel}
            </div>
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
