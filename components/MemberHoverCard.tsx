"use client";

import { cityById, type CircleMember } from "@/lib/circleData";
import Avatar from "./Avatar";
import { IconCity, IconHidden, IconPin } from "./Icons";

/**
 * Who someone is, without committing to opening them.
 *
 * On a map of three hundred faces, clicking every pin to find out who it is
 * is the whole cost of browsing. This appears on hover, says the four things
 * that decide whether you care — name, what they do, where, and how much of
 * that they've chosen to share — and gets out of the way. Pointer devices
 * only: on a phone a tap already opens the real card, and a hover card that
 * fires on touch is just a card you can't dismiss.
 */
export default function MemberHoverCard({ m }: { m: CircleMember }) {
  const city = cityById(m.cityId);
  const mode =
    m.mode === "off"
      ? { icon: <IconHidden size={12} />, text: "Not sharing a location" }
      : m.mode === "live"
        ? { icon: <IconPin size={12} />, text: `${city?.name} · sharing live` }
        : { icon: <IconCity size={12} />, text: `${city?.name} · city only` };

  return (
    <span
      // Positioning and the entrance transform both live in .hover-card:
      // a Tailwind translate utility here would be overwritten by the
      // transition's own transform, which is how this first shipped sitting
      // beside the pin instead of above it.
      className="hover-card pointer-events-none absolute z-[60] block w-[236px] rounded-2xl border border-[var(--line)] p-2.5 text-left"
      style={{ background: "var(--card)", boxShadow: "var(--shadow-lift)" }}
      role="tooltip"
    >
      <span className="flex items-center gap-2.5">
        <Avatar name={m.name} size={38} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold leading-tight">{m.name}</span>
          <span className="block truncate text-[11.5px] leading-tight text-[var(--ink-soft)]">{m.headline}</span>
          <span className="block truncate text-[11.5px] leading-tight text-[var(--ink-soft)]">{m.company}</span>
        </span>
      </span>
      <span className="mt-2 flex items-center gap-1 text-[11px] text-[var(--ink-soft)]">
        {mode.icon} {mode.text}
      </span>
    </span>
  );
}
