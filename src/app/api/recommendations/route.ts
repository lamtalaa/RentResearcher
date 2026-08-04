import { NextRequest, NextResponse } from "next/server";
import { fetchCraigslistCategory } from "@/lib/craigslist";
import { buildRecommendations, searchBand } from "@/lib/recommend";
import { buildInsights } from "@/lib/scoring";
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

  const band = searchBand(profile);
  const settled = await Promise.allSettled(
    categories.map((cat) => fetchCraigslistCategory(cat, band.min, band.max)),
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

  const { results, totalFound } = buildRecommendations(all, profile, categories, limit);

  const body: RecommendationsResponse = {
    generatedAt: new Date().toISOString(),
    profile,
    insights: buildInsights(profile),
    sources,
    results,
    totalFound,
  };

  return NextResponse.json(body);
}
