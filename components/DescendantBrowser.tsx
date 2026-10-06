"use client";

import { useMemo, useState } from "react";
import { ancestorsOf, childrenOf, descendantIds, entityById, type MockEntity } from "@/lib/networks";

/**
 * A child group of a network — TiE Global's Regions, IIT Bombay's Batches —
 * browsed flat instead of drilled.
 *
 * The old version listed only the direct children, so TiE Hyderabad sat five
 * clicks down behind a region nobody thinks in. Here the whole subtree is one
 * searchable list: the level chips ("Regions 5 · Chapters 74") pick how deep
 * you want to look and the city chips narrow it, so a region is a filter you
 * can ignore rather than a gate you must pass.
 */
export default function DescendantBrowser({
  groupLabel,
  items,
  wide,
  onOpen,
}: {
  groupLabel: string;
  /** The direct children in this group — the root of everything browsable here. */
  items: MockEntity[];
  wide: boolean;
  onOpen: (id: string) => void;
}) {
  /** Every node in this group's subtree, the direct children included. */
  const all = useMemo<MockEntity[]>(() => {
    const seen = new Map<string, MockEntity>();
    for (const item of items) {
      seen.set(item.id, item);
      for (const id of descendantIds(item.id)) {
        const e = entityById(id);
        if (e) seen.set(id, e);
      }
    }
    return [...seen.values()];
  }, [items]);

  /** Levels present in the subtree, shallowest first — "Region", then "Chapter". */
  const levels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of all) counts.set(e.label, (counts.get(e.label) ?? 0) + 1);
    const depthOf = new Map<string, number>();
    for (const e of all) depthOf.set(e.label, Math.min(depthOf.get(e.label) ?? Infinity, ancestorsOf(e.id).length));
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => (depthOf.get(a.label)! - depthOf.get(b.label)!) || a.label.localeCompare(b.label));
  }, [all]);

  const [level, setLevel] = useState(items[0]?.label ?? levels[0]?.label ?? "");
  const [city, setCity] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // A search spans every level — you type "Hyderabad" without first knowing
  // whether Hyderabad is a region, a chapter or a class.
  const q = query.trim().toLowerCase();
  const atLevel = q ? all : all.filter((e) => e.label === level);
  const matching = q
    ? atLevel.filter((e) => `${e.name} ${e.place?.city ?? ""} ${e.label}`.toLowerCase().includes(q))
    : atLevel;

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of matching) if (e.place?.city) counts.set(e.place.city, (counts.get(e.place.city) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [matching]);

  const shown = (city ? matching.filter((e) => e.place?.city === city) : matching).sort(
    (a, b) => (a.place?.city ?? "zzz").localeCompare(b.place?.city ?? "zzz") || a.name.localeCompare(b.name)
  );

  return (
    <div className="mt-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${levels.map((l) => `${l.count} ${l.label.toLowerCase()}${l.count === 1 ? "" : "s"}`).join(", ")}…`}
        className="w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-[12.5px] outline-none focus:border-[var(--brand)]"
      />

      {levels.length > 1 && !q && (
        <div className="mt-2 flex flex-wrap gap-1">
          {levels.map((l) => (
            <button
              key={l.label}
              onClick={() => {
                setLevel(l.label);
                setCity(null);
              }}
              className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
              style={
                level === l.label
                  ? { background: "color-mix(in srgb, var(--brand) 14%, var(--card))", color: "var(--brand)" }
                  : { color: "var(--ink-soft)" }
              }
            >
              {l.label}s <span className="opacity-60">{l.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* City chips only earn their space when a city actually groups several
          things. One chapter per city means 70 chips that each filter to one
          row — the search field already handles that case. */}
      {cities.some((c) => c.count > 1) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <button
            onClick={() => setCity(null)}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
            style={city === null ? { background: "var(--sunk)", color: "var(--ink)" } : { color: "var(--ink-soft)" }}
          >
            Everywhere
          </button>
          {cities.slice(0, 10).map((c) => (
            <button
              key={c.name}
              onClick={() => setCity(c.name)}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
              style={city === c.name ? { background: "var(--sunk)", color: "var(--ink)" } : { color: "var(--ink-soft)" }}
            >
              {c.name} <span className="opacity-60">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--ink-soft)]">Nothing in {groupLabel.toLowerCase()} matches that.</p>
      ) : (
        <div className={`mt-3 grid gap-2 ${wide ? "sm:grid-cols-2" : ""}`}>
          {shown.map((c) => {
            // Where this sits below the node whose page we're on — so a flat
            // list of 74 chapters still says which region each belongs to.
            // Ancestor 0 is that node itself, which the header already names.
            const context = ancestorsOf(c.id).slice(1).map((a) => a.name);
            return (
              <button key={c.id} onClick={() => onOpen(c.id)} className="card p-3 text-left transition-colors hover:border-[var(--brand)]">
                <p className="text-[13.5px] font-semibold leading-tight">
                  {c.emoji} {c.name}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">
                  {c.label}
                  {c.place ? ` · ${c.place.city}` : ""}
                  {context.length > 0 ? ` · ${context.join(" › ")}` : ""}
                </p>
                <p className="mt-1 line-clamp-2 text-[12px] text-[var(--ink-soft)]">{c.blurbMock}</p>
                <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                  {(c.access ?? "open") === "request" && "🔒 "}
                  {c.memberCountMock.toLocaleString()} members
                  {c.childLabel && childrenOf(c.id).length > 0 ? ` · ${childrenOf(c.id).length} ${c.childLabel.toLowerCase()}` : ""} →
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
