import { Insights, Listing, Profile, ScoredListing } from "./types";

/**
 * Scores each listing 0-100 against the renter's profile. The weights are tuned
 * for a renter whose income comfortably qualifies (40x rule) but whose credit
 * score is deep subprime, so credit-flexibility signals dominate.
 *
 *   budget fit          0-25
 *   credit friendliness 0-35
 *   income fit          0-20
 *   freshness           0-10
 *   listing quality     0-10
 */

export function buildInsights(profile: Profile): Insights {
  const monthlyGross = Math.round(profile.annualIncome / 12);
  const maxRent40x = Math.round(profile.annualIncome / 40);
  const pctIncomeAtMaxBudget = Math.round((profile.maxBudget / monthlyGross) * 100);
  const creditTier =
    profile.creditScore < 580
      ? profile.creditScore < 500
        ? "deep-subprime"
        : "subprime"
      : profile.creditScore < 670
        ? "fair"
        : profile.creditScore < 740
          ? "good"
          : "excellent";
  return {
    monthlyGross,
    maxRent40x,
    pctIncomeAtMaxBudget,
    incomeQualifies: profile.maxBudget <= maxRent40x,
    creditTier,
  };
}

interface KeywordRule {
  pattern: RegExp;
  points: number;
  reason?: string;
  warning?: string;
}

const CREDIT_KEYWORDS: KeywordRule[] = [
  { pattern: /no credit check/i, points: 17, reason: "Explicitly no credit check" },
  { pattern: /no credit(?! check)/i, points: 14, reason: "No credit required" },
  { pattern: /(bad|poor|low|any|all) credit/i, points: 14, reason: "Bad credit OK" },
  { pattern: /credit (flexible|negotiable)|flexible credit/i, points: 12, reason: "Flexible on credit" },
  { pattern: /no background check/i, points: 8, reason: "No background check" },
  { pattern: /(private|by) (landlord|owner)|owner direct/i, points: 8, reason: "Private landlord (often more flexible)" },
  { pattern: /no (broker('s)? )?fee|fee[- ]?free/i, points: 6, reason: "No broker fee" },
  { pattern: /guarantor(s)? (ok|accepted|welcome)/i, points: 6, reason: "Accepts guarantors" },
  { pattern: /cash (ok|accepted|preferred)/i, points: 4, reason: "Cash accepted" },
  { pattern: /no lease|month[- ]to[- ]month|flexible lease/i, points: 4, reason: "Flexible lease terms" },
  { pattern: /student(s)? (ok|welcome)/i, points: 3, reason: "Students welcome (lighter screening)" },
  { pattern: /utilities included|all utilities/i, points: 3, reason: "Utilities included" },
  {
    pattern: /(good|excellent|strong|great) credit|7\d\d\+|credit (score )?(of )?(6[5-9]\d|7\d\d)/i,
    points: -15,
    warning: "Asks for strong credit — you'd likely need a guarantor",
  },
  {
    pattern: /credit (check|report|screening) (required|is required|mandatory)/i,
    points: -10,
    warning: "Credit check required — bring a guarantor plan",
  },
  { pattern: /broker('s)? fee|one month fee|15% fee/i, points: -8, warning: "Charges a broker fee" },
  {
    pattern: /background (and|&) credit|credit (and|&) background/i,
    points: -6,
    warning: "Runs credit + background screening",
  },
];

// Rooms and sublets very rarely run formal credit checks, which is the main
// obstacle for a deep-subprime score — so they get a category head start.
const CATEGORY_CREDIT_BASE: Record<Listing["category"], number> = {
  roo: 16,
  sub: 14,
  apa: 6,
};

const CATEGORY_CREDIT_REASON: Record<Listing["category"], string | null> = {
  roo: "Room shares usually skip formal credit checks",
  sub: "Sublets usually skip formal credit checks",
  apa: null,
};

function budgetScore(price: number, profile: Profile): { pts: number; reason?: string } {
  if (price >= profile.minBudget && price <= profile.maxBudget) {
    return { pts: 25, reason: `In your $${profile.minBudget}–$${profile.maxBudget} sweet spot` };
  }
  if (price < profile.minBudget) {
    // Below budget is still fine — small haircut since deep discounts can signal scams.
    const gap = profile.minBudget - price;
    return { pts: Math.max(18, 25 - Math.round(gap / 50)), reason: "Under budget" };
  }
  const over = price - profile.maxBudget;
  return { pts: Math.max(0, 25 - Math.round(over / 20)) };
}

function incomeScore(price: number, profile: Profile): { pts: number; reason?: string } {
  const max40x = profile.annualIncome / 40;
  const max36x = profile.annualIncome / 36;
  if (price <= max40x) {
    return { pts: 20, reason: "Your income passes the standard 40x-rent rule here" };
  }
  if (price <= max36x) return { pts: 14 };
  const monthly = profile.annualIncome / 12;
  return { pts: Math.max(0, Math.round(20 - ((price / monthly) * 100 - 30) / 2)) };
}

function freshnessScore(postedAt: number): { pts: number; reason?: string } {
  const ageH = (Date.now() - postedAt) / 3_600_000;
  if (ageH <= 24) return { pts: 10, reason: "Posted in the last 24 hours" };
  if (ageH <= 72) return { pts: 8, reason: "Posted in the last 3 days" };
  if (ageH <= 24 * 7) return { pts: 6 };
  if (ageH <= 24 * 14) return { pts: 4 };
  return { pts: 2 };
}

export function scoreListing(listing: Listing, profile: Profile): ScoredListing {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const budget = budgetScore(listing.price, profile);
  score += budget.pts;
  if (budget.reason) reasons.push(budget.reason);

  // Credit friendliness (0-35)
  let credit = CATEGORY_CREDIT_BASE[listing.category];
  const categoryReason = CATEGORY_CREDIT_REASON[listing.category];
  if (categoryReason) reasons.push(categoryReason);
  for (const rule of CREDIT_KEYWORDS) {
    if (rule.pattern.test(listing.title)) {
      credit += rule.points;
      if (rule.points > 0 && rule.reason) reasons.push(rule.reason);
      if (rule.points < 0 && rule.warning) warnings.push(rule.warning);
    }
  }
  score += Math.min(35, Math.max(0, credit));

  const income = incomeScore(listing.price, profile);
  score += income.pts;
  if (income.reason) reasons.push(income.reason);

  const fresh = freshnessScore(listing.postedAt);
  score += fresh.pts;
  if (fresh.reason) reasons.push(fresh.reason);

  // Listing quality (0-10)
  let quality = 0;
  if (listing.imageUrl) quality += 4;
  if (listing.neighborhood) quality += 2;
  if (listing.title.length >= 20) quality += 2;
  if (listing.price >= profile.minBudget * 0.6) quality += 2;
  else warnings.push("Priced suspiciously low for NYC — screen carefully for scams");
  score += quality;

  return {
    ...listing,
    score: Math.min(100, Math.max(0, Math.round(score))),
    reasons,
    warnings,
  };
}

export function rankListings(listings: Listing[], profile: Profile): ScoredListing[] {
  const seen = new Set<string>();
  const scored: ScoredListing[] = [];
  for (const listing of listings) {
    if (seen.has(listing.id)) continue;
    seen.add(listing.id);
    scored.push(scoreListing(listing, profile));
  }
  scored.sort((a, b) => b.score - a.score || b.postedAt - a.postedAt);
  return scored;
}
