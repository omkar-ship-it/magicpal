"use client";

import Link from "next/link";
import { HOME_FEED_ID, PUBLIC_ENTITY_ID, type MockEntity } from "@/lib/networks";

/**
 * The context switcher — one icon per network you're in, down the left edge.
 * Switching context is the most frequent thing you do here and a dropdown
 * made it a menu; this makes it a glance and a single click, and it scales
 * to twenty networks without getting worse.
 *
 * Selecting a network doesn't open anything — it changes what the map and
 * the top bar are about. Opening its feed is a separate, deliberate act.
 */
export default function NetworkRail({
  networks,
  selectedId,
  adminIds,
  onSelect,
  onOpenHome,
}: {
  networks: MockEntity[];
  /** null = the public, all-encompassing network. */
  selectedId: string | null;
  adminIds: string[];
  onSelect: (id: string | null) => void;
  onOpenHome: () => void;
}) {
  const item =
    "relative grid h-11 w-11 flex-none place-items-center rounded-2xl text-[18px] transition-all";

  return (
    <div
      className="pointer-events-auto fixed inset-y-0 left-0 z-[1100] hidden w-[64px] flex-col items-center gap-1.5 overflow-y-auto border-r border-[var(--line)] py-3 lg:flex"
      style={{ background: "var(--card)" }}
    >
      <button onClick={onOpenHome} className={`${item} group`} title="Your feed — everything you're in" style={{ background: "var(--sunk)" }}>
        🏠
        <span className="pointer-events-none absolute left-[56px] z-10 hidden whitespace-nowrap rounded-lg px-2 py-1 text-[12px] font-semibold group-hover:block" style={{ background: "var(--ink)", color: "var(--bg)" }}>
          Your feed
        </span>
      </button>

      <div className="my-1 h-px w-7" style={{ background: "var(--line)" }} />

      <button
        onClick={() => onSelect(null)}
        className={`${item} group`}
        title="Public Network — everyone"
        style={
          selectedId === null
            ? { background: "color-mix(in srgb, var(--brand) 16%, var(--card))", boxShadow: "inset 0 0 0 2px var(--brand)" }
            : { background: "var(--sunk)" }
        }
      >
        🌍
        <span className="pointer-events-none absolute left-[56px] z-10 hidden whitespace-nowrap rounded-lg px-2 py-1 text-[12px] font-semibold group-hover:block" style={{ background: "var(--ink)", color: "var(--bg)" }}>
          Public Network
        </span>
      </button>

      <div className="my-1 h-px w-7" style={{ background: "var(--line)" }} />

      {networks.map((n) => {
        const on = selectedId === n.id;
        return (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={`${item} group`}
            title={n.name}
            style={
              on
                ? { background: "color-mix(in srgb, var(--brand) 16%, var(--card))", boxShadow: "inset 0 0 0 2px var(--brand)" }
                : { background: "var(--sunk)" }
            }
          >
            {n.emoji}
            {adminIds.includes(n.id) && (
              <span
                className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full text-[9px]"
                style={{ background: "var(--brand)", color: "#fff" }}
                title="You run this"
              >
                ★
              </span>
            )}
            <span
              className="pointer-events-none absolute left-[56px] z-10 hidden whitespace-nowrap rounded-lg px-2 py-1 text-[12px] font-semibold group-hover:block"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
            >
              {n.name}
            </span>
          </button>
        );
      })}

      <Link
        href="/profile"
        className={`${item} group mt-auto`}
        title="Join or leave networks"
        style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
      >
        +
        <span className="pointer-events-none absolute left-[56px] z-10 hidden whitespace-nowrap rounded-lg px-2 py-1 text-[12px] font-semibold group-hover:block" style={{ background: "var(--ink)", color: "var(--bg)" }}>
          Manage networks
        </span>
      </Link>
    </div>
  );
}

export { HOME_FEED_ID, PUBLIC_ENTITY_ID };
