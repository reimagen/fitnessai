'use client';

import { useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

type CurrentWeekData = {
  weekStart: Date;
  weekEnd: Date;
  daysOfWeek: Date[];
};

/**
 * Hook to get the current week's start date, end date, and all days of the week.
 * Calculates these values once and memoizes them to avoid duplicate calculations
 * across multiple components.
 */
export function useCurrentWeek(): CurrentWeekData {
  return useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 }); // Saturday
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return { weekStart, weekEnd, daysOfWeek };
  }, []);
}
