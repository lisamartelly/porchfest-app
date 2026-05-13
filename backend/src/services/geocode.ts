import logger from "../lib/logger.js";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
  confidence: number;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "PorchfestPal/1.0";
const MIN_DELAY_MS = 1100; // Nominatim requires max 1 req/sec

let lastRequestTime = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function geocodeAddress(
  address: string,
  defaultCity?: string | null,
  defaultState?: string | null
): Promise<GeocodeResult | null> {
  let query = address.trim();

  const lowerQuery = query.toLowerCase();
  const hasCity = defaultCity && lowerQuery.includes(defaultCity.toLowerCase());
  const hasState = defaultState && lowerQuery.includes(defaultState.toLowerCase());

  if (defaultCity && !hasCity) query += `, ${defaultCity}`;
  if (defaultState && !hasState) query += `, ${defaultState}`;

  await throttle();

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      addressdetails: "1",
      countrycodes: "us",
    });

    const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) {
      logger.warn({ status: res.status, query }, "Nominatim request failed");
      return null;
    }

    const results = (await res.json()) as NominatimResult[];

    if (results.length === 0) {
      logger.info({ query }, "No geocoding results found");
      return null;
    }

    const top = results[0];
    return {
      lat: parseFloat(top.lat),
      lng: parseFloat(top.lon),
      display_name: top.display_name,
      confidence: top.importance,
    };
  } catch (err) {
    logger.error({ err, query }, "Geocoding error");
    return null;
  }
}
