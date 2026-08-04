"use client";

import { useMemo, useState } from "react";
import type {
  Category,
  RecommendationsResponse,
  ScoredListing,
} from "@/lib/types";
import { CATEGORY_LABELS, DEFAULT_PROFILE } from "@/lib/types";

type SortKey = "score" | "priceAsc" | "priceDesc" | "newest";

const CATEGORY_STYLES: Record<Category, string> = {
  apa: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  roo: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  sub: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

function timeAgo(ts: number): string {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-300 border-emerald-400/40 bg-emerald-400/10";
  if (score >= 65) return "text-lime-300 border-lime-400/40 bg-lime-400/10";
  if (score >= 50) return "text-amber-300 border-amber-400/40 bg-amber-400/10";
  return "text-rose-300 border-rose-400/40 bg-rose-400/10";
}

function ListingCard({ listing }: { listing: ScoredListing }) {
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25 hover:bg-white/[0.06]"
    >
      <div className="relative h-44 w-full overflow-hidden bg-white/5">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-white/20">
            🏙️
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur ${CATEGORY_STYLES[listing.category]}`}
        >
          {CATEGORY_LABELS[listing.category]}
        </span>
        <span
          className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-xs font-bold backdrop-blur ${scoreColor(listing.score)}`}
          title="Match score for your budget, income, and credit profile"
        >
          {listing.score} match
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xl font-bold text-white">{listing.priceLabel}</span>
          <span className="shrink-0 text-xs text-white/50">{timeAgo(listing.postedAt)}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-medium text-white/90">{listing.title}</h3>
        <p className="text-xs text-white/50">
          {[listing.neighborhood, listing.borough].filter(Boolean).join(" · ") ||
            "NYC metro area"}
        </p>

        {listing.reasons.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {listing.reasons.slice(0, 3).map((reason) => (
              <span
                key={reason}
                className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-200/90"
              >
                ✓ {reason}
              </span>
            ))}
          </div>
        )}
        {listing.warnings.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {listing.warnings.map((warning) => (
              <span
                key={warning}
                className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-200/90"
              >
                ⚠ {warning}
              </span>
            ))}
          </div>
        )}

        <span className="mt-auto pt-2 text-sm font-semibold text-sky-300 group-hover:text-sky-200">
          View listing ↗
        </span>
      </div>
    </a>
  );
}

function GamePlan({ creditScore, maxRent40x }: { creditScore: number; maxRent40x: number }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/[0.07] to-transparent p-6">
      <h2 className="text-lg font-bold text-white">
        Your approval game plan (credit score {creditScore})
      </h2>
      <p className="mt-1 text-sm text-white/60">
        Your income is your superpower — it supports up to ${maxRent40x.toLocaleString()}/mo
        under the standard 40x rule. Your credit score is the hurdle, so here is how renters
        in your position actually get approved in NYC:
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white/[0.04] p-4">
          <h3 className="font-semibold text-emerald-300">1. Target rooms, shares & sublets first</h3>
          <p className="mt-1 text-sm text-white/70">
            At $1,300–$1,400 these are most of the market anyway, and private roommates and
            subletters almost never pull credit. They care about pay stubs and vibes. That is
            why they rank high in your results.
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-4">
          <h3 className="font-semibold text-emerald-300">2. Use a guarantor service for real apartments</h3>
          <p className="mt-1 text-sm text-white/70">
            <a className="text-sky-300 underline" href="https://www.theguarantors.com" target="_blank" rel="noopener noreferrer">TheGuarantors</a>,{" "}
            <a className="text-sky-300 underline" href="https://www.insurent.com" target="_blank" rel="noopener noreferrer">Insurent</a> and{" "}
            <a className="text-sky-300 underline" href="https://www.leaseleap.com" target="_blank" rel="noopener noreferrer">Leap</a>{" "}
            co-sign institutionally (typically 70–110% of one month&apos;s rent as a one-time fee).
            Many NYC buildings accept them even with poor credit, because your income qualifies.
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-4">
          <h3 className="font-semibold text-emerald-300">3. Lead with proof of income</h3>
          <p className="mt-1 text-sm text-white/70">
            Bring an employment letter, 2–3 recent pay stubs, and bank statements to every
            viewing. Offering to auto-pay rent or showing savings often outweighs the score
            with small private landlords. Note: in NYC, deposits are legally capped at one
            month&apos;s rent, and landlords can&apos;t require months of prepaid rent — New Jersey
            allows up to 1.5 months deposit, which gives you a bargaining chip there.
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-4">
          <h3 className="font-semibold text-emerald-300">4. Work the long game</h3>
          <p className="mt-1 text-sm text-white/70">
            Apply to{" "}
            <a className="text-sky-300 underline" href="https://housingconnect.nyc.gov" target="_blank" rel="noopener noreferrer">NYC Housing Connect</a>{" "}
            lotteries (income-based, credit-lenient), and start rebuilding credit now — a
            secured card plus rent reporting can move a 480 meaningfully within a year.
          </p>
        </div>
      </div>
      <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200/90">
        ⚠ Scam radar: at this price point, never wire money, pay a deposit before seeing the
        unit in person, or pay anyone who &quot;can&apos;t meet you&quot;. If it looks too good for NYC, it is.
      </p>
    </section>
  );
}

export default function Home() {
  const [minBudget, setMinBudget] = useState(DEFAULT_PROFILE.minBudget);
  const [maxBudget, setMaxBudget] = useState(DEFAULT_PROFILE.maxBudget);
  const [annualIncome, setAnnualIncome] = useState(DEFAULT_PROFILE.annualIncome);
  const [creditScore, setCreditScore] = useState(DEFAULT_PROFILE.creditScore);
  const [categories, setCategories] = useState<Category[]>(["apa", "roo", "sub"]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [sort, setSort] = useState<SortKey>("score");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");

  const search = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        minBudget: String(minBudget),
        maxBudget: String(maxBudget),
        annualIncome: String(annualIncome),
        creditScore: String(creditScore),
        categories: categories.join(","),
        limit: "150",
      });
      const res = await fetch(`/api/recommendations?${params}`);
      if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`);
      const body = (await res.json()) as RecommendationsResponse;
      setData(body);
      if (body.results.length === 0) {
        setError(
          body.sources.every((s) => !s.ok)
            ? "The listing source didn’t respond — try again in a minute."
            : "No live listings matched right now. Widen the budget range slightly and retry.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: Category) => {
    setCategories((prev) => {
      const next = prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      return next.length === 0 ? prev : next;
    });
  };

  const visibleResults = useMemo(() => {
    if (!data) return [];
    const filtered =
      categoryFilter === "all"
        ? data.results
        : data.results.filter((r) => r.category === categoryFilter);
    const sorted = [...filtered];
    switch (sort) {
      case "priceAsc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        sorted.sort((a, b) => b.postedAt - a.postedAt);
        break;
      default:
        sorted.sort((a, b) => b.score - a.score);
    }
    return sorted;
  }, [data, sort, categoryFilter]);

  const insights = data?.insights;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6">
      {/* Hero */}
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          NYC metro · live listings
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Rent<span className="text-sky-400">Researcher</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-white/60">
          One click pulls live rentals across the five boroughs, Jersey, Westchester and Long
          Island, then ranks them for <em>your</em> reality: a ${minBudget.toLocaleString()}–$
          {maxBudget.toLocaleString()} budget, ${annualIncome.toLocaleString()} income, and a
          credit score that needs a workaround.
        </p>
      </header>

      {/* Profile controls */}
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/50">
            Min budget ($/mo)
            <input
              type="number"
              value={minBudget}
              min={0}
              onChange={(e) => setMinBudget(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-base font-semibold text-white outline-none focus:border-sky-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/50">
            Max budget ($/mo)
            <input
              type="number"
              value={maxBudget}
              min={100}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-base font-semibold text-white outline-none focus:border-sky-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/50">
            Annual income ($)
            <input
              type="number"
              value={annualIncome}
              min={0}
              step={1000}
              onChange={(e) => setAnnualIncome(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-base font-semibold text-white outline-none focus:border-sky-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/50">
            Credit score
            <input
              type="number"
              value={creditScore}
              min={300}
              max={850}
              onChange={(e) => setCreditScore(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-base font-semibold text-white outline-none focus:border-sky-400"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Include:
          </span>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                categories.includes(cat)
                  ? CATEGORY_STYLES[cat]
                  : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              {CATEGORY_LABELS[cat]}s
            </button>
          ))}
        </div>

        <button
          onClick={search}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Scanning live listings…" : "Find my top rentals"}
        </button>
      </section>

      {/* Insights */}
      {insights && (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Income check: {insights.incomeQualifies ? "PASS" : "STRETCH"}
            </p>
            <p className="mt-1 text-sm text-white/80">
              ${data.profile.annualIncome.toLocaleString()}/yr supports up to{" "}
              <strong>${insights.maxRent40x.toLocaleString()}/mo</strong> under the 40x rule —
              your ${data.profile.maxBudget.toLocaleString()} budget clears it easily.
            </p>
          </div>
          <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
              Rent-to-income
            </p>
            <p className="mt-1 text-sm text-white/80">
              Max budget is <strong>{insights.pctIncomeAtMaxBudget}%</strong> of your ~$
              {insights.monthlyGross.toLocaleString()}/mo gross — comfortably under the 30%
              guideline.
            </p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              Credit: {insights.creditTier.replace("-", " ")}
            </p>
            <p className="mt-1 text-sm text-white/80">
              Results are ranked to favor no-credit-check rooms, sublets and private
              landlords. Game plan below for everything else.
            </p>
          </div>
        </section>
      )}

      {/* Source status */}
      {data && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span>
            {data.totalFound} live matches · showing top {visibleResults.length} · updated{" "}
            {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
          {data.sources.map((s) => (
            <span
              key={s.id}
              className={`rounded-full border px-2 py-0.5 ${
                s.ok
                  ? "border-emerald-400/30 text-emerald-300"
                  : "border-rose-400/30 text-rose-300"
              }`}
              title={s.error}
            >
              {s.ok ? "●" : "○"} {s.label}: {s.ok ? s.count : "unavailable"}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error}
        </p>
      )}

      {/* Sort / filter bar */}
      {data && data.results.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "apa", "roo", "sub"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  categoryFilter === cat
                    ? "border-white/40 bg-white/10 text-white"
                    : "border-white/10 text-white/50 hover:text-white/80"
                }`}
              >
                {cat === "all" ? "All" : `${CATEGORY_LABELS[cat]}s`}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none"
          >
            <option value="score">Best match</option>
            <option value="priceAsc">Price: low → high</option>
            <option value="priceDesc">Price: high → low</option>
            <option value="newest">Newest first</option>
          </select>
        </div>
      )}

      {/* Results grid */}
      {loading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
            />
          ))}
        </div>
      )}
      {!loading && visibleResults.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleResults.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* Game plan */}
      <div className="mt-10">
        <GamePlan
          creditScore={data?.profile.creditScore ?? creditScore}
          maxRent40x={insights?.maxRent40x ?? Math.round(annualIncome / 40)}
        />
      </div>

      <footer className="mt-10 text-center text-xs text-white/40">
        Live data from Craigslist&apos;s public search API across the NYC metro area. Listings
        are third-party — always verify in person before paying anything.
      </footer>
    </main>
  );
}
