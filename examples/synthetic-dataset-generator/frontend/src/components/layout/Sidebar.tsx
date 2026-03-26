import { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, LogOut, X, Loader2, Trash2, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/useChat';
import { renameSession } from '@/services/api';
import type { SessionMeta } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Format a date for display in the sidebar.
 */
function formatSessionDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { newChat, sessions, sessionId, switchSession, isLoadingHistory, deleteSession, refreshSessions } = useChat();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSessionId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSessionId]);

  const handleNewDataset = () => {
    newChat();
    onClose(); // Close mobile sidebar after action
  };

  const handleSelectSession = async (session: SessionMeta) => {
    if (editingSessionId) return; // Don't switch while editing
    await switchSession(session.sessionId);
    onClose(); // Close mobile sidebar after action
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent session selection when clicking delete
    if (window.confirm('Delete this conversation? This action cannot be undone.')) {
      await deleteSession(sessionId);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, session: SessionMeta) => {
    e.stopPropagation();
    setEditingSessionId(session.sessionId);
    setEditName(session.name || session.lastMessage || 'New conversation');
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditName('');
  };

  const handleSaveEdit = async (e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editingSessionId || !editName.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await renameSession(editingSessionId, editName.trim());
      await refreshSessions(); // Refresh to get updated name
      setEditingSessionId(null);
      setEditName('');
    } catch (error) {
      console.error('Failed to rename session:', error);
      alert('Failed to rename session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit(e);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

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
        <nav className="flex-1 p-4 space-y-4 overflow-hidden flex flex-col">
          {/* New Chat - starts fresh session */}
          <button
            onClick={handleNewDataset}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">New Chat</span>
          </button>

          {/* History section */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 shrink-0">
              History
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-2">No sessions yet</p>
              ) : (
                sessions.map((session) => {
                  const isActive = session.sessionId === sessionId;
                  const isLoading = isActive && isLoadingHistory;
                  const isEditing = editingSessionId === session.sessionId;
                  const displayName = session.name || session.lastMessage || 'New conversation';
                  return (
                    <div
                      key={session.sessionId}
                      className="relative group"
                    >
                      <button
                        onClick={() => handleSelectSession(session)}
                        disabled={isLoadingHistory || isEditing}
                        className={cn(
                          'w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-surface',
                          (isLoadingHistory || isEditing) && 'cursor-default'
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
                        ) : (
                          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 pr-16">
                          {isEditing ? (
                            <form onSubmit={handleSaveEdit} className="flex items-center gap-1">
                              <input
                                ref={inputRef}
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                disabled={isSaving}
                                className="w-full text-sm font-medium bg-surface border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                maxLength={100}
                              />
                              <button
                                type="submit"
                                onClick={handleSaveEdit}
                                disabled={isSaving || !editName.trim()}
                                className="p-1 rounded hover:bg-primary/20 text-primary disabled:opacity-50"
                                title="Save"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                                disabled={isSaving}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          ) : (
                            <>
                              <p className="text-sm font-medium truncate">
                                {displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatSessionDate(session.createdAt)}
                              </p>
                            </>
                          )}
                        </div>
                      </button>
                      {/* Action buttons - show on hover when not editing */}
                      {!isEditing && (
                        <div className={cn(
                          'absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5',
                          'opacity-0 group-hover:opacity-100 transition-opacity'
                        )}>
                          <button
                            onClick={(e) => handleStartEdit(e, session)}
                            className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Rename conversation"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSession(e, session.sessionId)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
