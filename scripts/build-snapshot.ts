/**
 * Fetches live Craigslist listings and writes a snapshot to
 * public/data/listings.json for the static (GitHub Pages) build, where the
 * browser scores the snapshot client-side.
 *
 * Bands are fetched separately so the default $1,300–$1,400 budget gets full
 * depth (the API caps each query at ~360 newest results) while still covering
 * a wide range for users who edit the budget controls on the hosted site.
 *
 * Run with: npx tsx scripts/build-snapshot.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchCraigslistCategory } from "../src/lib/craigslist";
import { Category, CATEGORY_LABELS, Listing, ListingsSnapshot, SourceStatus } from "../src/lib/types";

const CATEGORIES: Category[] = ["apa", "roo", "sub"];
const BANDS: Array<[number, number]> = [
  [1100, 1450], // default profile's search band — full depth
  [500, 1100],
  [1450, 2500],
];

async function main() {
  const sources: SourceStatus[] = [];
  const byId = new Map<string, Listing>();

  for (const cat of CATEGORIES) {
    let count = 0;
    let error: string | undefined;
    for (const [min, max] of BANDS) {
      try {
        const listings = await fetchCraigslistCategory(cat, min, max, 20_000);
        for (const listing of listings) {
          if (!byId.has(listing.id)) {
            byId.set(listing.id, listing);
            count++;
          }
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        console.error(`  band $${min}-$${max} for ${cat} failed: ${error}`);
      }
    }
    console.log(`${CATEGORY_LABELS[cat]}: ${count} listings`);
    sources.push({
      id: cat,
      label: `Craigslist NYC metro — ${CATEGORY_LABELS[cat]}s`,
      ok: count > 0,
      count,
      ...(count === 0 && error ? { error } : {}),
    });
  }

  const snapshot: ListingsSnapshot = {
    generatedAt: new Date().toISOString(),
    sources,
    listings: [...byId.values()],
  };

  if (snapshot.listings.length === 0) {
    throw new Error("Snapshot is empty — all sources failed; refusing to overwrite.");
  }

  const outPath = path.join(process.cwd(), "public", "data", "listings.json");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(snapshot));
  console.log(`Wrote ${snapshot.listings.length} listings to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
