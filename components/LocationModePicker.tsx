"use client";

import { LOCATION_MODES, type LocationMode } from "@/lib/circleData";
import { IconCity, IconHidden, IconPin } from "./Icons";

/**
 * The one control this product is really asking a member to make a decision
 * about, so it reads the same on the invite screen and in your own settings
 * rather than being built twice.
 */
export function ModeIcon({ mode, size = 17 }: { mode: LocationMode; size?: number }) {
  if (mode === "off") return <IconHidden size={size} />;
  if (mode === "live") return <IconPin size={size} />;
  return <IconCity size={size} />;
}

export default function LocationModePicker({ value, onChange }: { value: LocationMode; onChange: (m: LocationMode) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {LOCATION_MODES.map((m) => {
        const on = value === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors"
            style={on ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 7%, var(--card))" } : { borderColor: "var(--line)" }}
            aria-pressed={on}
          >
            <span
              className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg"
              style={on ? { background: "var(--brand)", color: "#fff" } : { background: "var(--sunk)", color: "var(--ink-soft)" }}
            >
              <ModeIcon mode={m.id} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-tight">{m.label}</span>
              <span className="block text-[11.5px] leading-4 text-[var(--ink-soft)]">{m.detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
