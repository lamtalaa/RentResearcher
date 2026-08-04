# RentResearcher

One-click NYC metro rental recommendations, tuned for a real-world profile: a
**$1,300–$1,400/month budget**, **~$70k income**, and a **~480 credit score**.

Press one button and the app:

1. Pulls **live listings** (apartments, rooms/shares, and sublets) across the five
   boroughs, North Jersey, Westchester, Long Island, and Fairfield from Craigslist's
   public search API — every result links straight to the listing.
2. **Scores each listing 0–100** for your situation:
   - budget fit ($1,300–$1,400 sweet spot, under-budget still counts)
   - income fit ($70k passes the standard 40x-rent rule up to $1,750/mo)
   - **credit friendliness** — the dominant factor for a 480 score: no-credit-check
     mentions, private landlords, no-fee listings, and rooms/sublets (which rarely
     run credit checks) rank up; "excellent credit required" and broker fees rank down
   - freshness and listing quality (photos, neighborhood info, scam-price detection)
3. Shows a personalized **approval game plan**: guarantor services (TheGuarantors,
   Insurent, Leap), NYC deposit-cap rules, proof-of-income tactics, NYC Housing
   Connect, and scam warnings.

Everything (budget, income, credit score, categories) is editable in the UI, so the
defaults are a starting point, not a limit.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Find my top rentals**.

## Stack

- Next.js (App Router) + React + TypeScript + Tailwind CSS
- Server-side aggregation in `src/app/api/recommendations/route.ts`
- Craigslist search-API decoder in `src/lib/craigslist.ts`
- Scoring engine in `src/lib/scoring.ts`

## Notes

- Listings are third-party. Never wire money or pay a deposit before seeing a unit
  in person — sub-$1,400 NYC listings are prime scam territory.
- The listing source occasionally rate-limits; the UI reports per-source health and
  a retry usually succeeds.
