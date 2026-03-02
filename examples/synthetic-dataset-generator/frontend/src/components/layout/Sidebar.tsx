import { Plus, FolderOpen, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-60 bg-sidebar flex flex-col',
          'transform transition-transform duration-200 ease-in-out',
          'lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">DS</span>
          </div>
          <span className="text-foreground font-semibold text-lg">DataSynth</span>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="ml-auto lg:hidden p-1 hover:bg-surface rounded"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {/* New Dataset - active state */}
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Plus className="w-5 h-5" />
            <span className="font-medium">New Dataset</span>
          </button>

          {/* History - disabled for v1 */}
          <button
            disabled
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground cursor-not-allowed opacity-50"
          >
            <FolderOpen className="w-5 h-5" />
            <span className="font-medium">History</span>
          </button>
        </nav>

        {/* Sign Out button */}
        <div className="p-4 border-t border-border">
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors font-medium">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
