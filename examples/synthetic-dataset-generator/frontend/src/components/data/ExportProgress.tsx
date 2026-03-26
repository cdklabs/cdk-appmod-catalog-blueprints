/**
 * ExportProgress component - shows export status with embedded download buttons.
 * Shows spinner while generating, download buttons when complete.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Download } from 'lucide-react';
import type { DownloadLinks } from '../../types';

/**
 * Props for the ExportProgress component.
 */
interface ExportProgressProps {
  /** Current download links (shows which files are ready) */
  downloads: DownloadLinks | null;
  /** Whether export is currently in progress */
  isExporting: boolean;
}

/**
 * Download button for a single file.
 */
function DownloadButton({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      download
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 rounded text-xs text-black font-medium transition-colors"
    >
      <Download className="w-3 h-3" />
      {label}
    </a>
  );
}

/**
 * ExportProgress component displays export status.
 * Shows spinner while generating, download buttons when complete.
 */
export function ExportProgress({ downloads, isExporting: _isExporting }: ExportProgressProps) {
  // Check if any downloads are available (matches ExportButton behavior)
  const hasAnyDownloads = Boolean(
    downloads?.csv || downloads?.json || downloads?.schema || downloads?.script
  );

  const isComplete = hasAnyDownloads;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 max-w-[320px]"
      >
        <div className="flex items-center gap-2">
          {/* Icon */}
          {isComplete ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </motion.div>
          ) : (
            <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
          )}

          {/* Label */}
          <span className={isComplete ? 'text-emerald-400' : 'text-sky-400'}>
            {isComplete ? 'Dataset ready for download' : 'Generating full dataset...'}
          </span>
        </div>

        {/* Download buttons when complete */}
        {isComplete && downloads && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-slate-700"
          >
            <div className="grid grid-cols-2 gap-2">
              {downloads.csv && <DownloadButton url={downloads.csv} label="CSV" />}
              {downloads.json && <DownloadButton url={downloads.json} label="JSON" />}
              {downloads.schema && <DownloadButton url={downloads.schema} label="Schema" />}
              {downloads.script && <DownloadButton url={downloads.script} label="Script" />}
            </div>
            <p className="mt-2 text-xs text-slate-500">Links expire in 24 hours</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
