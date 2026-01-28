/**
 * Converts a string to title case.
 */
export const toTitleCase = (value: string) =>
  value.replace(/\w\S*/g, word => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`);
