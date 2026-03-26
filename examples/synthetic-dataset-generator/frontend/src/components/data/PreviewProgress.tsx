/**
 * PreviewProgress component - shows preview generation status inline in chat.
 * Shows spinner while generating preview, checkmark when complete.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Table2 } from 'lucide-react';

/**
 * Props for the PreviewProgress component.
 */
interface PreviewProgressProps {
  /** Whether preview data has been generated */
  hasPreview: boolean;
  /** Whether schema has been generated */
  hasSchema: boolean;
}

/**
 * PreviewProgress component displays preview generation status.
 * Shows spinner while generating, checkmark when complete.
 */
export function PreviewProgress({ hasPreview, hasSchema }: PreviewProgressProps) {
  const isComplete = hasSchema && hasPreview;

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
            {isComplete ? 'Preview ready' : 'Generating preview data...'}
          </span>
        </div>

        {/* Info text when complete */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 pt-2 border-t border-slate-700"
          >
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Table2 className="w-3.5 h-3.5" />
              <span>Check the Preview panel for sample data</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
