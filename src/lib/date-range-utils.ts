import { startOfWeek, subWeeks } from 'date-fns';

/**
 * Get the date 6 weeks ago from today
 * Used for filtering recent workout/lift data
 */
export function getSixWeeksAgo(): Date {
  return subWeeks(new Date(), 6);
}

/**
 * Get the date range for 6 completed weeks + partial current week
 * Used for plan generation and comprehensive strength analysis
 *
 * Example:
 * - If today is Wednesday, returns from Sunday 6 weeks ago to today
 * - Ensures analysis includes a full week's context
 */
export function getSixWeeksRange(): { start: Date; end: Date } {
  const weekStart = startOfWeek(new Date());
  const sixWeeksBeforeCurrentWeek = subWeeks(weekStart, 6);
  return { start: sixWeeksBeforeCurrentWeek, end: new Date() };
}
