import { Category, Listing } from "./types";

/**
 * Craigslist's search API (the same one its own site uses) returns results in a
 * compact encoded format:
 *  - posting ids and posted dates are deltas from `decode.minPostingId` /
 *    `decode.minPostedDate`
 *  - locations are indexes into `decode.locations` / `decode.locationDescriptions`
 *  - per-item fields are tagged arrays: [6, slug], [13, viewToken], [4, ...imageIds],
 *    [10, "$1,400"], and the bare string element is the listing title.
 */

const SAPI_BASE = "https://sapi.craigslist.org/web/v8/postings/search/full";
const NEW_YORK_AREA_ID = 3; // covers the 5 boroughs + NJ, Westchester, Long Island, Fairfield subareas

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const SUBAREA_NAMES: Record<string, string> = {
  mnh: "Manhattan",
  brk: "Brooklyn",
  que: "Queens",
  brx: "Bronx",
  stn: "Staten Island",
  wch: "Westchester",
  lgi: "Long Island",
  jsy: "North Jersey",
  fct: "Fairfield CT",
};

type RawItem = Array<number | string | Array<number | string>>;

interface SapiData {
  decode: {
    minPostingId: number;
    minPostedDate: number;
    locations: Array<0 | [number, string, string?]>;
    locationDescriptions: Array<0 | string>;
  };
  items: RawItem[];
  totalResultCount: number;
}

function taggedArray(item: RawItem, tag: number): Array<number | string> | null {
  for (const el of item) {
    if (Array.isArray(el) && el[0] === tag) return el;
  }
  return null;
}

function extractTitle(item: RawItem): string | null {
  // The title is the last bare string element after the location string (index 4).
  for (let i = item.length - 1; i > 4; i--) {
    const el = item[i];
    if (typeof el === "string") return el;
  }
  return null;
}

function decodeItem(item: RawItem, data: SapiData, category: Category): Listing | null {
  try {
    const idDelta = item[0];
    const dateDelta = item[1];
    const price = item[3];
    const locString = item[4];
    if (
      typeof idDelta !== "number" ||
      typeof dateDelta !== "number" ||
      typeof price !== "number" ||
      typeof locString !== "string"
    ) {
      return null;
    }

    const postingId = data.decode.minPostingId + idDelta;
    const postedAt = (data.decode.minPostedDate + dateDelta) * 1000;

    // location string: "<locIdx>:<descIdx>~<lat>~<lon>"
    let neighborhood: string | null = null;
    let borough: string | null = null;
    let lat: number | null = null;
    let lon: number | null = null;
    let subarea: string | null = null;
    let site = "newyork";
    const locMatch = locString.match(/^(\d+):(\d+)~(-?[\d.]+)~(-?[\d.]+)/);
    if (locMatch) {
      const loc = data.decode.locations[Number(locMatch[1])];
      if (Array.isArray(loc)) {
        site = loc[1] ?? site;
        subarea = (loc[2] as string) ?? null;
        borough = subarea ? (SUBAREA_NAMES[subarea] ?? subarea) : null;
      }
      const desc = data.decode.locationDescriptions[Number(locMatch[2])];
      neighborhood = typeof desc === "string" ? desc : null;
      lat = Number(locMatch[3]);
      lon = Number(locMatch[4]);
    }

    const slugEl = taggedArray(item, 6);
    const tokenEl = taggedArray(item, 13);
    const priceLabelEl = taggedArray(item, 10);
    const imagesEl = taggedArray(item, 4);

    const slug = slugEl ? String(slugEl[1]) : null;
    const token = tokenEl ? String(tokenEl[1]) : null;

    let url: string;
    if (slug && token) {
      // Canonical share URL — verified to resolve with a 200.
      url = `https://www.craigslist.org/view/d/${slug}/${token}`;
    } else if (slug && subarea) {
      url = `https://${site}.craigslist.org/${subarea}/${category}/d/${slug}/${postingId}.html`;
    } else {
      return null;
    }

    let imageUrl: string | null = null;
    if (imagesEl && imagesEl.length > 1) {
      const first = String(imagesEl[1]);
      const imageId = first.includes(":") ? first.split(":")[1] : first;
      if (imageId) imageUrl = `https://images.craigslist.org/${imageId}_600x450.jpg`;
    }

    const title = extractTitle(item);
    if (!title || price <= 0) return null;

    return {
      id: String(postingId),
      title: title.trim(),
      price,
      priceLabel: priceLabelEl ? String(priceLabelEl[1]) : `$${price.toLocaleString()}`,
      url,
      category,
      neighborhood,
      borough,
      lat,
      lon,
      postedAt,
      imageUrl,
    };
  } catch {
    return null;
  }
}

export async function fetchCraigslistCategory(
  category: Category,
  minPrice: number,
  maxPrice: number,
  timeoutMs = 12_000,
): Promise<Listing[]> {
  const params = new URLSearchParams({
    batch: `${NEW_YORK_AREA_ID}-0-360-0-0`,
    cc: "US",
    lang: "en",
    searchPath: category,
    min_price: String(minPrice),
    max_price: String(maxPrice),
  });

  const res = await fetch(`${SAPI_BASE}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Craigslist API responded with HTTP ${res.status}`);
  }
  const body = (await res.json()) as { data?: SapiData };
  const data = body.data;
  if (!data?.items || !data.decode) {
    throw new Error("Unexpected Craigslist API response shape");
  }

  const listings: Listing[] = [];
  for (const item of data.items) {
    const listing = decodeItem(item, data, category);
    if (listing) listings.push(listing);
  }
  return listings;
}
