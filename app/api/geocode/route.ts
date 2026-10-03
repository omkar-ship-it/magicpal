import { NextResponse } from "next/server";

/**
 * Turns "Koramangala, Bengaluru" into a lat/lng via OpenStreetMap's
 * Nominatim — free, no API key, which is why the whole map stack is
 * demoable without anyone provisioning a paid geocoder first.
 *
 * Proxied through our own server rather than called from the browser for
 * two reasons: Nominatim's usage policy requires a descriptive User-Agent
 * identifying the application, which a browser's fetch can't set (it's a
 * forbidden header); and routing it server-side means the one place rate
 * limiting or a provider swap would need to happen is here, not in every
 * client that ever calls it.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MagicPal/1.0 (networking app; contact admin@bandicoventures.com)" },
    });
    if (!res.ok) return NextResponse.json({ results: [] });

    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    return NextResponse.json({
      results: data.map((d) => ({
        label: d.display_name,
        lat: Number(d.lat),
        lng: Number(d.lon),
      })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
