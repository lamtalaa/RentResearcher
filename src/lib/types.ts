export type Category = "apa" | "roo" | "sub";

export const CATEGORY_LABELS: Record<Category, string> = {
  apa: "Apartment",
  roo: "Room / Share",
  sub: "Sublet",
};

export interface Profile {
  minBudget: number;
  maxBudget: number;
  annualIncome: number;
  creditScore: number;
}

export const DEFAULT_PROFILE: Profile = {
  minBudget: 1300,
  maxBudget: 1400,
  annualIncome: 70000,
  creditScore: 480,
};

export interface Listing {
  id: string;
  title: string;
  price: number;
  priceLabel: string;
  url: string;
  category: Category;
  neighborhood: string | null;
  borough: string | null;
  lat: number | null;
  lon: number | null;
  postedAt: number; // epoch ms
  imageUrl: string | null;
}

export interface ScoredListing extends Listing {
  score: number; // 0-100
  reasons: string[];
  warnings: string[];
}

export interface SourceStatus {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface Insights {
  monthlyGross: number;
  maxRent40x: number;
  pctIncomeAtMaxBudget: number;
  incomeQualifies: boolean;
  creditTier: "deep-subprime" | "subprime" | "fair" | "good" | "excellent";
}

export interface RecommendationsResponse {
  generatedAt: string;
  profile: Profile;
  insights: Insights;
  sources: SourceStatus[];
  results: ScoredListing[];
  totalFound: number;
}

/** Prebuilt listings snapshot consumed by the static (GitHub Pages) build. */
export interface ListingsSnapshot {
  generatedAt: string;
  sources: SourceStatus[];
  listings: Listing[];
}
