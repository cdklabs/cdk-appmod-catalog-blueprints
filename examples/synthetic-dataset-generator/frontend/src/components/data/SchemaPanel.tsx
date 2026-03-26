import { type ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { DataTable } from './DataTable';
import { SkeletonTable } from './SkeletonTable';
import type { SchemaColumn } from '@/types';

/**
 * Schema panel displaying the generated dataset schema.
 * Shows column names, types, and descriptions in a sortable table.
 */
export function SchemaPanel() {
  const { schema, isPreparingData } = useChat();

  // Define columns for the schema table
  const columns: ColumnDef<SchemaColumn, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Column',
      cell: ({ getValue }) => (
        <span className="font-mono text-primary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="font-mono text-foreground">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() as string}</span>
      ),
    },
  ];

  // Render content based on state
  const renderContent = () => {
    // Show skeleton with spinner when preparing data and no schema yet
    if (schema.length === 0 && isPreparingData) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-sky-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Preparing schema...</span>
          </div>
          <SkeletonTable rows={5} columns={3} />
        </div>
      );
    }

    if (schema.length === 0 && !isPreparingData) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              No schema yet. Describe your dataset to generate one.
            </p>
          </div>
        </div>
      );
    }

    return <DataTable columns={columns} data={schema} />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-sidebar border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Schema</h2>
        {schema.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-surface text-muted-foreground rounded">
            {schema.length} columns
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
