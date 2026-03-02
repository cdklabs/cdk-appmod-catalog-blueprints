import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Download, FileJson, FileText, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DownloadLinks } from '@/types';

interface ExportButtonProps {
  downloads: DownloadLinks | null;
  disabled?: boolean;
}

/**
 * Export dropdown button component.
 * Shows available download options for the generated dataset.
 */
export function ExportButton({ downloads, disabled = false }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if any downloads are available
  const hasDownloads = downloads && (
    downloads.csv || downloads.json || downloads.schema || downloads.script
  );

  const isDisabled = disabled || !hasDownloads;

  // Download options configuration
  // Keys match backend export_dataset.py: csv, json, schema, script
  const options = [
    { key: 'csv' as const, label: 'CSV', icon: FileText },
    { key: 'json' as const, label: 'JSON', icon: FileJson },
    { key: 'schema' as const, label: 'Schema', icon: FileText },
    { key: 'script' as const, label: 'Generation Script', icon: FileCode },
  ];

  const handleSelect = (url: string) => {
    setIsOpen(false);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          isDisabled
            ? 'bg-input text-muted cursor-not-allowed'
            : 'bg-accent text-accent-foreground hover:bg-accent/90'
        )}
      >
        <Download className="h-4 w-4" />
        <span>Export</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 py-1 bg-surface border border-border rounded-md shadow-lg z-50">
          {options.map(({ key, label, icon: Icon }) => {
            const url = downloads?.[key];
            if (!url) return null;

            return (
              <button
                key={key}
                onClick={() => handleSelect(url)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
