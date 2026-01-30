/**
 * Simple fuzzy matching utility for exercise name filtering
 * Prioritizes: exact match → starts with → contains
 */

export interface FuzzyMatchResult {
  item: string;
  score: number;
}

/**
 * Filters and ranks items by relevance to the search query
 * Uses case-insensitive matching
 */
export function fuzzyMatch(
  query: string,
  items: string[]
): FuzzyMatchResult[] {
  if (!query.trim()) {
    return items.map((item) => ({ item, score: 0 }));
  }

  const normalizedQuery = query.toLowerCase().trim();

  const results = items
    .map((item) => {
      const normalizedItem = item.toLowerCase();

      // Exact match (highest score)
      if (normalizedItem === normalizedQuery) {
        return { item, score: 3 };
      }

      // Starts with (high score)
      if (normalizedItem.startsWith(normalizedQuery)) {
        return { item, score: 2 };
      }

      // Contains (medium score)
      if (normalizedItem.includes(normalizedQuery)) {
        return { item, score: 1 };
      }

      // No match
      return { item, score: -1 };
    })
    .filter((result) => result.score >= 0)
    .sort((a, b) => {
      // Sort by score descending, then alphabetically
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.item.localeCompare(b.item);
    });

  return results;
}
