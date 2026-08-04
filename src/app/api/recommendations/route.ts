import { NextRequest, NextResponse } from "next/server";
import { fetchCraigslistCategory } from "@/lib/craigslist";
import { buildInsights, rankListings } from "@/lib/scoring";
import {
  Category,
  CATEGORY_LABELS,
  DEFAULT_PROFILE,
  Listing,
  Profile,
  RecommendationsResponse,
  SourceStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function num(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const profile: Profile = {
    minBudget: num(sp.get("minBudget"), DEFAULT_PROFILE.minBudget, 0, 20_000),
    maxBudget: num(sp.get("maxBudget"), DEFAULT_PROFILE.maxBudget, 100, 20_000),
    annualIncome: num(sp.get("annualIncome"), DEFAULT_PROFILE.annualIncome, 0, 10_000_000),
    creditScore: num(sp.get("creditScore"), DEFAULT_PROFILE.creditScore, 300, 850),
  };
  if (profile.minBudget > profile.maxBudget) {
    [profile.minBudget, profile.maxBudget] = [profile.maxBudget, profile.minBudget];
  }

  const requested = (sp.get("categories") ?? "apa,roo,sub")
    .split(",")
    .filter((c): c is Category => c === "apa" || c === "roo" || c === "sub");
  const categories: Category[] = requested.length > 0 ? requested : ["apa", "roo", "sub"];
  const limit = num(sp.get("limit"), 30, 1, 200);

  // Search a slightly wider band than the stated budget: under-budget finds are
  // wins, and a small stretch above catches negotiable listings.
  const searchMin = Math.max(0, profile.minBudget - 200);
  const searchMax = profile.maxBudget + 50;

  const settled = await Promise.allSettled(
    categories.map((cat) => fetchCraigslistCategory(cat, searchMin, searchMax)),
  );

  const sources: SourceStatus[] = [];
  const all: Listing[] = [];
  settled.forEach((outcome, i) => {
    const cat = categories[i];
    if (outcome.status === "fulfilled") {
      all.push(...outcome.value);
      sources.push({
        id: cat,
        label: `Craigslist NYC metro — ${CATEGORY_LABELS[cat]}s`,
        ok: true,
        count: outcome.value.length,
      });
    } else {
      sources.push({
        id: cat,
        label: `Craigslist NYC metro — ${CATEGORY_LABELS[cat]}s`,
        ok: false,
        count: 0,
        error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
      });
    }
  });

  const ranked = rankListings(all, profile);

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

  const body: RecommendationsResponse = {
    generatedAt: new Date().toISOString(),
    profile,
    insights: buildInsights(profile),
    sources,
    results,
    totalFound: ranked.length,
  };

  return NextResponse.json(body);
}
