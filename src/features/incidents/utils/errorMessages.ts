/**
 * Formatting + error helpers for the incidents feature.
 *
 * All implementations now live in src/utils/dateUtils.ts — this file
 * re-exports them so existing imports within the incidents feature
 * continue to work without any path changes.
 */
export {
  friendlyError,
  formatDateTime,
  formatRelativeDate,
  formatDuration,
} from '../../../utils/dateUtils';
