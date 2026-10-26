"use client";

import { useState } from "react";
import { avatarTint, characterUrl } from "@/lib/avatar";

/**
 * Every face in the members-only experience comes through here.
 *
 * Before this each surface built its own `<span class="avatar"><img …>`, so
 * sizes, rings and fallbacks drifted apart and the characters floated on
 * transparent backgrounds like unfinished line work. One component, one
 * seeded tint behind the art, one ring — a crowd of them on the map now
 * reads as a set rather than a pile of clippings.
 */
export default function Avatar({
  name,
  photoUrl,
  style = "notionists",
  size = 36,
  ring,
  className = "",
  title,
  local = false,
}: {
  /** Also the seed: the same person is the same face everywhere. */
  name: string;
  /** An uploaded photo wins over the generated character. */
  photoUrl?: string | null;
  style?: string;
  size?: number;
  /** Width of the surrounding ring in px — markers on the map want one, lists don't. */
  ring?: number;
  className?: string;
  title?: string;
  /**
   * Draw the face locally instead of fetching the character art.
   *
   * For surfaces that put dozens of people on one screen. The art comes
   * from a third party, and ninety-odd parallel requests to it is enough
   * to fail on a conference wifi — which is precisely where a demo gets
   * shown. Initials on the same seeded tint are instant, identical every
   * time, and cannot embarrass anybody mid-sentence.
   */
  local?: boolean;
}) {
  const src = photoUrl || characterUrl(style, name);
  /**
   * The character art is fetched from a third party, and a hundred of them
   * on one screen is a hundred requests that can be rate-limited, slow or
   * simply offline. A broken-image glyph in a grid of faces is the single
   * worst thing that can happen on a screen somebody is being shown — so
   * when the fetch fails the tinted disc keeps its initials instead.
   */
  const [failed, setFailed] = useState(false);
  const drawLocally = local || failed;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className={`relative inline-block flex-none overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: avatarTint(name),
        boxShadow: ring ? `0 0 0 ${ring}px var(--card)` : undefined,
      }}
      title={title ?? name}
    >
      {drawLocally ? (
        <span
          aria-hidden="true"
          className="grid h-full w-full place-items-center font-semibold"
          style={{ fontSize: Math.round(size * 0.38), color: "color-mix(in srgb, var(--ink) 70%, transparent)" }}
        >
          {initials}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
