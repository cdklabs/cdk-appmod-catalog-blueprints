import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useChat } from '@/hooks/useChat';
import { DataTable } from './DataTable';
import { SkeletonTable } from './SkeletonTable';

/**
 * Preview panel displaying sample data rows.
 * Shows a dynamic table with columns derived from the schema.
 */
export function PreviewPanel() {
  const { schema, preview, totalRows, isStreaming } = useChat();

  // Generate columns dynamically from schema
  const columns = useMemo((): ColumnDef<Record<string, unknown>, unknown>[] => {
    return schema.map((col) => ({
      accessorKey: col.name,
      header: col.name,
      cell: ({ getValue }) => {
        const value = getValue();

        // Format different types appropriately
        if (value === null || value === undefined) {
          return <span className="text-muted italic">null</span>;
        }

        if (typeof value === 'number') {
          return (
            <span className="font-mono text-primary">
              {value.toLocaleString()}
            </span>
          );
        }

        if (typeof value === 'boolean') {
          return (
            <span className={value ? 'text-green-400' : 'text-red-400'}>
              {value.toString()}
            </span>
          );
        }

        return <span className="text-foreground">{String(value)}</span>;
      },
    }));
  }, [schema]);

  // Render content based on state
  const renderContent = () => {
    if (preview.length === 0 && isStreaming) {
      return <SkeletonTable rows={5} columns={Math.max(4, schema.length)} />;
    }

    if (preview.length === 0 && !isStreaming) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              No preview data yet. Generate a dataset to see sample rows.
            </p>
          </div>
        </div>
      );
    }

    return <DataTable columns={columns} data={preview} />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Preview</h2>
        {preview.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-surface text-muted-foreground rounded">
            {preview.length}{totalRows && totalRows > preview.length ? ` / ${totalRows.toLocaleString()}` : ''} rows
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}
