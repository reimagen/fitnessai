const DISPLAY_OVERRIDES: Record<string, string> = {
  hiit: 'HIIT',
  stairs: 'Stairs',
  bike: 'Bike',
};

export function formatExerciseDisplayName(name: string): string {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  return DISPLAY_OVERRIDES[lower] || trimmed;
}
