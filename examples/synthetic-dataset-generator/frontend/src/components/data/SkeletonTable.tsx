import { cn } from '@/lib/utils';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

/**
 * Skeleton loading placeholder for data tables.
 * Shows animated pulse effect while data is loading.
 */
export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-surface">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <th
                key={colIndex}
                className="h-9 px-4 text-left border-b border-border"
              >
                <div
                  className={cn(
                    'h-4 rounded bg-input animate-pulse',
                    colIndex === 0 ? 'w-24' : colIndex === columns - 1 ? 'w-32' : 'w-16'
                  )}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                'h-10 border-b border-border',
                rowIndex % 2 === 0 ? 'bg-background' : 'bg-surface'
              )}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4">
                  <div
                    className={cn(
                      'h-4 rounded bg-input animate-pulse',
                      // Vary widths for visual interest
                      colIndex === 0
                        ? 'w-20'
                        : colIndex === columns - 1
                          ? 'w-40'
                          : `w-${16 + (rowIndex % 3) * 8}`
                    )}
                    style={{
                      // Dynamic widths for skeleton cells
                      width: colIndex === 0 ? '80px' : colIndex === columns - 1 ? '160px' : `${64 + ((rowIndex + colIndex) % 4) * 24}px`,
                      animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
