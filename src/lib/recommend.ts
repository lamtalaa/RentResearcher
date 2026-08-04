import { rankListings } from "./scoring";
import { Category, Listing, Profile, ScoredListing } from "./types";

/**
 * Shared recommendation builder used by both the server API route and the
 * static (GitHub Pages) client, where scoring runs in the browser against a
 * prebuilt listings snapshot.
 */

// Search a slightly wider band than the stated budget: under-budget finds are
// wins, and a small stretch above catches negotiable listings.
export function searchBand(profile: Profile): { min: number; max: number } {
  return { min: Math.max(0, profile.minBudget - 200), max: profile.maxBudget + 50 };
}

export interface RecommendationSet {
  results: ScoredListing[];
  totalFound: number;
}

export function buildRecommendations(
  listings: Listing[],
  profile: Profile,
  categories: Category[],
  limit: number,
): RecommendationSet {
  const band = searchBand(profile);
  const inScope = listings.filter(
    (l) => categories.includes(l.category) && l.price >= band.min && l.price <= band.max,
  );
  const ranked = rankListings(inScope, profile);

  // Top slice by overall score, but guarantee each category keeps enough
  // representation for client-side filters (rooms dominate the raw ranking
  // because they score highest on credit friendliness).
  const MIN_PER_CATEGORY = 30;
  const results = ranked.slice(0, limit);
  const included = new Set(results.map((r) => r.id));
  for (const cat of categories) {
    let count = results.filter((r) => r.category === cat).length;
    if (count >= MIN_PER_CATEGORY) continue;
    for (const listing of ranked) {
      if (count >= MIN_PER_CATEGORY) break;
      if (listing.category !== cat || included.has(listing.id)) continue;
      results.push(listing);
      included.add(listing.id);
      count++;
    }
  }
  results.sort((a, b) => b.score - a.score || b.postedAt - a.postedAt);

  return { results, totalFound: ranked.length };
}
