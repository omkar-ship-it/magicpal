"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CircleMember } from "@/lib/circleData";
import { branchesFor, faceBudget, H, layout, trunkFor, W } from "@/lib/treeData";
import Avatar from "./Avatar";
import MemberHoverCard from "./MemberHoverCard";

/**
 * The room, growing.
 *
 * One renderer, used both by the tree that grows out of a building on the
 * map and by the standalone page — because the whole argument for this
 * picture is that it is the *same* picture wherever it turns up, and two
 * implementations of it would have disagreed by the second change.
 *
 * Everyone in the room is on it. What changes with size is how much of
 * each person you can see: foliage far out, faces where there is room for
 * them, every one a face if you come close enough. The tree is laid out
 * against a fixed square viewBox and scaled by the SVG, so a phone, a
 * laptop and a screenshot get the same composition rather than a reflow.
 *
 * The faces are HTML over the drawing rather than SVG `<image>`: they are
 * the product's own Avatar, with its photo and initials fallbacks, and
 * re-implementing that inside the SVG would be a second avatar to keep in
 * step. The leaves that are *not* faces stay in the SVG, where four
 * hundred circles cost nothing.
 */

/**
 * Beyond this many faces at once, stop fetching drawn characters.
 *
 * The art comes from a third party, and hundreds of parallel requests to
 * it is enough to fail on conference wifi — which is precisely where this
 * gets shown. The avatars are lazy-loaded, so at a deep zoom the browser
 * only asks for the ones near the viewport and most of this never fires;
 * the cap is the backstop for a room big enough that even that is a lot.
 * Past it every face falls back to initials on its own seeded tint:
 * instant, identical every time, and still one disc per person.
 */
const ART_BUDGET = 240;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export default function GrowingTree({
  people,
  rank,
  highlight = null,
  scale = 1,
  onBranch,
  onPerson,
  className = "",
  style,
}: {
  people: CircleMember[];
  /** Orders the faces within a branch — on the map, relevance to the reader. */
  rank?: (a: CircleMember, b: CircleMember) => number;
  /** A discipline to hold; everything else dims rather than disappears. */
  highlight?: string | null;
  /**
   * How much bigger than its laid-out box the tree is actually drawn.
   *
   * On the map this comes from the map's own zoom, so pinching is how you
   * explore the tree — the gesture everybody already has. The component
   * can't measure it, because a CSS transform doesn't change the box a
   * ResizeObserver reports.
   */
  scale?: number;
  onBranch?: (disciplineId: string) => void;
  onPerson?: (m: CircleMember) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement | null>(null);
  /** The laid-out width, before `scale`. Everything is sized off the two. */
  const [boxW, setBoxW] = useState(0);
  /**
   * The branch under the pointer.
   *
   * Sweeping the labels lights each branch in turn and drops the rest
   * back, so the shape of "who is in here" can be read without committing
   * to a filter. It is a preview of the click, and it is most of what
   * makes the picture feel like something rather than a diagram.
   */
  const [peek, setPeek] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const branches = useMemo(() => branchesFor(people, rank), [people, rank]);
  const canopy = useMemo(() => layout(branches), [branches]);
  const trunk = useMemo(() => trunkFor(), []);

  /**
   * How big the tree actually is on screen.
   *
   * `boxW` is the laid-out width — measured with offsetWidth, which a CSS
   * transform does not touch — so the drawn width is that times `scale`,
   * and it moves the moment the caller changes the scale. Measuring the
   * transformed box instead would have been stale after every pinch,
   * because a transform changes no layout and fires no ResizeObserver.
   */
  const drawnW = boxW * scale;
  /** Screen pixels per canvas unit: the exchange rate everything below uses. */
  const unit = drawnW / W;

  /**
   * A face grows with the picture until it is comfortable, and then stops.
   *
   * After that the tree gets bigger and the faces do not, which is exactly
   * what makes room for more of them — `faceBudget` turns that back into a
   * number of people per branch.
   */
  const facePx = clamp(Math.round(42 * Math.min(1, unit * 1.9)), 30, 44);
  const dotPx = clamp(7.5 * Math.min(1.6, unit * 2.2), 3.4, 13);
  /** The same dot, in canvas units, since that is what the SVG wants. */
  const dotR = unit > 0 ? dotPx / 2 / unit : 5;

  /**
   * Everything laid out in CSS pixels has to be divided by the scale.
   *
   * The tree is grown with a CSS transform — cheap, composited, and the
   * only way a four-hundred-leaf canopy stays smooth under a pinch on a
   * phone. The cost is that every child is magnified with it, so a face
   * asked for at 44px came out at 76 and the canopy at full zoom was a
   * heap of overlapping discs. Anything measured in pixels rather than in
   * canvas units gets `inv` applied, and comes out the size it asked for.
   */
  const inv = 1 / Math.max(scale, 0.01);

  /**
   * Every branch shows its few most relevant people as faces, always.
   *
   * Packing alone says a tree this small has room for about two faces in
   * total, and it is right — but a canopy of pure foliage is a chart, and
   * faces are the only reason anybody looks at this instead of the list.
   * So the first few per branch are not negotiable; they are allowed to
   * sit a little close, which at this size reads as a cluster rather than
   * as a collision. Everything past them is packing.
   */
  const heroes = drawnW > 300 ? 4 : drawnW > 170 ? 2 : 0;
  const budgets = canopy.drawn.map((d) =>
    Math.max(
      Math.min(d.leaves.length, heroes),
      faceBudget(d.leaves.length, canopy.spacing, drawnW, facePx)
    )
  );
  const faceTotal = budgets.reduce((n, m) => n + m, 0);
  const local = faceTotal > ART_BUDGET;

  /** Narrow enough that a full label would lie across its own canopy. */
  const roomy = drawnW > 470;
  /** A held branch wins over a hovered one; otherwise the hover previews it. */
  const lit = highlight ?? peek;

  return (
    <div
      ref={box}
      className={`relative select-none ${className}`}
      // The hover card is a child too, so it is magnified like everything
      // else; `--hover-k` is how .hover-card undoes it.
      style={{ aspectRatio: `${W} / ${H}`, ["--hover-k" as string]: inv, ...style }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {/*
           * One blur, for everything that glows.
           *
           * A filter per branch is seven raster passes on every frame the
           * map pans; a single pass over one group of wide, faint copies
           * gives the same halo and costs one.
           */}
          <filter id={`glow-${uid}`} x="-12%" y="-12%" width="124%" height="124%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          {/* Pale gold rather than amber: the trunk's job is to hold the
              canopy up, and at full saturation it was the loudest thing in
              a picture that is supposed to be about the faces. */}
          <linearGradient id={`bark-${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e6ae62" />
            <stop offset="0.6" stopColor="#f6cb92" />
            <stop offset="1" stopColor="#ffe6c4" />
          </linearGradient>
        </defs>

        {/*
         * The glow, at a third rather than a half.
         *
         * It used to sit in a pool of night dimmed into the basemap, where
         * it could be as bright as it liked. Over pale streets the same
         * pass reads as a smudge, so it is turned down to the point where
         * it is a halo around a line and not a second drawing.
         */}
        <g filter={`url(#glow-${uid})`} opacity={0.3}>
          {trunk.roots.map((d, i) => (
            <path key={i} d={d} fill="#f3b765" opacity={0.5} />
          ))}
          <path d={trunk.body} fill="#f3b765" opacity={0.6} />
          {canopy.drawn.map((d) => (
            <path
              key={d.branch.discipline.id}
              d={d.limb}
              fill={d.branch.discipline.hue}
              opacity={lit && lit !== d.branch.discipline.id ? 0.12 : 1}
            />
          ))}
        </g>

        {/* The crisp pass over the glow. */}
        {trunk.roots.map((d, i) => (
          <path key={i} d={d} fill={`url(#bark-${uid})`} opacity={0.85} />
        ))}
        <path d={trunk.body} fill={`url(#bark-${uid})`} />
        {trunk.strands.map((d, i) => (
          <path key={i} d={d} fill="#fff1d4" opacity={0.75} />
        ))}

        {canopy.drawn.map((d, i) => {
          const hue = d.branch.discipline.hue;
          const dim = lit != null && lit !== d.branch.discipline.id;
          const budget = budgets[i];
          return (
            /*
             * Two nested groups, one job each.
             *
             * The dim cannot ride on the same element as the grow-in: an
             * animation with `fill-mode: both` keeps asserting its final
             * `opacity: 1` and beats an inline style for good, so holding
             * a branch faded every other *label* and left every other
             * *branch* at full colour.
             */
            <g
              key={d.branch.discipline.id}
              style={{ opacity: dim ? 0.14 : 1, transition: "opacity 200ms ease" }}
            >
              <g className="tree-limb" style={{ animationDelay: `${110 + i * 80}ms` }}>
                {d.twigs.map((t, j) => (
                  <path key={j} d={t} fill={hue} opacity={0.5} />
                ))}
                <path d={d.limb} fill={hue} />
                {/*
                 * Everybody who isn't currently a face.
                 *
                 * Circles in the SVG rather than elements in the DOM: four
                 * hundred of these cost one paint, and four hundred
                 * positioned spans with a hover card each would cost the
                 * frame rate of the map they are sitting on. They are not
                 * decoration and they are not a sample — they are the rest
                 * of the room, each one a person, and the reason the crown
                 * is the size it is.
                 */}
                {d.leaves.map((l) =>
                  l.rank < budget ? null : (
                    <ellipse
                      key={l.member.id}
                      cx={l.x}
                      cy={l.y}
                      rx={dotR * 1.4}
                      ry={dotR * 0.82}
                      transform={`rotate(${Math.round(l.tilt)} ${l.x} ${l.y})`}
                      fill={hue}
                      opacity={0.84}
                    >
                      <title>{`${l.member.name} — ${l.member.headline}`}</title>
                    </ellipse>
                  )
                )}
              </g>
            </g>
          );
        })}
      </svg>

      {boxW > 0 &&
        canopy.drawn.map((d, i) => {
          const hue = d.branch.discipline.hue;
          const dim = lit != null && lit !== d.branch.discipline.id;
          const budget = budgets[i];
          return (
            <div key={d.branch.discipline.id} style={{ opacity: dim ? 0.22 : 1, transition: "opacity 200ms ease" }}>
              {/*
               * A face says nothing on its own, which is the one thing a
               * list of names does better. So the same hover card the map
               * pins use hangs off every face here: name, what they do,
               * where they are, how much of that they chose to share —
               * read without committing to opening anyone. Reused rather
               * than rewritten, so there is one answer to "who is that"
               * across the whole product.
               *
               * The host carries the position and the pop; the button
               * inside carries the lift. Scaling the host would scale the
               * card with it.
               */}
              {d.leaves
                .filter((l) => l.rank < budget)
                .map((l) => (
                  <span
                    key={l.member.id}
                    className="tree-leaf hover-host absolute block"
                    style={{
                      left: `${(l.x / W) * 100}%`,
                      top: `${(l.y / H) * 100}%`,
                      animationDelay: `${260 + i * 80 + Math.min(l.rank, 10) * 40}ms`,
                    }}
                  >
                    <MemberHoverCard m={l.member} local={local} />
                    <button
                      type="button"
                      onClick={() => onPerson?.(l.member)}
                      title={`${l.member.name} — ${l.member.headline}`}
                      className="tree-face block rounded-full"
                      style={{ boxShadow: `0 0 0 ${Math.max(1.5, facePx * 0.055) * inv}px ${hue}` }}
                    >
                      <Avatar name={l.member.name} size={Math.round(facePx * inv)} local={local} />
                    </button>
                  </span>
                ))}

              {/*
               * The label is also the door into the list, so it survives
               * every width — on a phone it drops the discipline's name
               * and keeps its glyph and its count, which is the part that
               * cannot be inferred from the colour of the foliage it is
               * sitting on.
               */}
              <button
                type="button"
                onClick={() => onBranch?.(d.branch.discipline.id)}
                onPointerEnter={() => setPeek(d.branch.discipline.id)}
                onPointerLeave={() => setPeek((cur) => (cur === d.branch.discipline.id ? null : cur))}
                onFocus={() => setPeek(d.branch.discipline.id)}
                onBlur={() => setPeek((cur) => (cur === d.branch.discipline.id ? null : cur))}
                /* Centred by the keyframes, not by -translate-x-1/2:
                   Tailwind v4 emits the standalone `translate` property,
                   which *composes* with the animation's `transform`
                   rather than being overridden by it, and every label
                   landed half its own width off its branch. */
                className="tree-pill absolute whitespace-nowrap rounded-full font-semibold"
                style={{
                  left: `${(d.tip.x / W) * 100}%`,
                  top: `${(d.tip.y / H) * 100}%`,
                  animationDelay: `${220 + i * 80}ms`,
                  padding: roomy ? `${5 * inv}px ${11 * inv}px` : `${3 * inv}px ${8 * inv}px`,
                  fontSize: (roomy ? 12.5 : 11) * inv,
                  borderRadius: 999 * inv,
                  // Light chrome, like everything else floating on this
                  // map. The near-black chip was built to sit in the dark
                  // pool that has gone, and on pale streets it read as a
                  // hole punched through the picture.
                  background: "color-mix(in srgb, var(--card) 94%, transparent)",
                  color: hue,
                  border: `${inv}px solid ${lit === d.branch.discipline.id ? hue : `${hue}66`}`,
                  boxShadow:
                    lit === d.branch.discipline.id
                      ? `0 0 0 ${3 * inv}px ${hue}22, var(--shadow-lift)`
                      : "var(--shadow)",
                  backdropFilter: "blur(8px)",
                }}
                title={`${d.branch.people.length} in ${d.branch.discipline.label} — open the list`}
                aria-label={`${d.branch.people.length} in ${d.branch.discipline.label} — open the list`}
              >
                <span className={roomy ? "mr-1.5 opacity-80" : "mr-1 opacity-80"}>{d.branch.discipline.icon}</span>
                {roomy && d.branch.discipline.label}
                <span className={roomy ? "ml-1.5 tabular-nums opacity-60" : "tabular-nums opacity-70"}>
                  {d.branch.people.length}
                </span>
              </button>
            </div>
          );
        })}
    </div>
  );
}
