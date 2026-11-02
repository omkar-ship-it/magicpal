"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CircleMember } from "@/lib/circleData";
import { branchesFor, layout, leavesFor, trunkFor } from "@/lib/treeData";
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
 * Laid out against a fixed 1000×700 viewBox and scaled by the SVG, so a
 * phone, a laptop and a screenshot all get the same composition rather than
 * a reflow. The faces are HTML over the drawing rather than SVG `<image>`:
 * they are the product's own Avatar, with its photo and initials
 * fallbacks, and re-implementing that inside the SVG would be a second
 * avatar to keep in step.
 */

const W = 1000;
const H = 700;

export default function GrowingTree({
  people,
  rank,
  highlight = null,
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
  onBranch?: (disciplineId: string) => void;
  onPerson?: (m: CircleMember) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement | null>(null);
  /**
   * How big the tree is actually being drawn, so the faces and the labels
   * can be sized in real pixels.
   *
   * Everything else scales for free inside the viewBox. These two can't:
   * an avatar scaled by the SVG would be a blurry raster, and a label
   * scaled by the SVG would be 7px on a phone.
   */
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
    const ro = new ResizeObserver(() => setBoxW(el.getBoundingClientRect().width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const branches = useMemo(() => branchesFor(people, rank), [people, rank]);
  const leaves = leavesFor(boxW);
  const drawn = useMemo(() => layout(branches, W, H, leaves), [branches, leaves]);
  const trunk = useMemo(() => trunkFor(branches, W, H), [branches]);

  const k = boxW / W;
  /**
   * A face shrinks with the picture until it stops being tappable, and
   * then it stops. The branch holds one fewer instead — see `leavesFor`.
   */
  const face = Math.max(24, Math.round(48 * k));
  /** Narrow enough that a full label would lie across its own branch. */
  const roomy = boxW > 470;
  /** A held branch wins over a hovered one; otherwise the hover previews it. */
  const lit = highlight ?? peek;

  return (
    <div
      ref={box}
      className={`relative select-none ${className}`}
      style={{ aspectRatio: `${W} / ${H}`, ...style }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {/*
           * One blur, for everything that glows.
           *
           * A filter per branch is seven raster passes on every frame the
           * map pans; a single pass over one group of wide, faint copies
           * gives the same neon and costs one.
           */}
          <filter id={`glow-${uid}`} x="-15%" y="-15%" width="130%" height="130%">
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
        <g filter={`url(#glow-${uid})`} opacity={0.34}>
          {trunk.roots.map((d, i) => (
            <path key={i} d={d} fill="#f3b765" opacity={0.5} />
          ))}
          <path d={trunk.body} fill="#f3b765" opacity={0.65} />
          {drawn.map((d) => (
            <path
              key={d.branch.discipline.id}
              d={d.body}
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

        {drawn.map((d, i) => {
          const hue = d.branch.discipline.hue;
          const dim = lit != null && lit !== d.branch.discipline.id;
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
            <g className="tree-limb" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <path d={d.body} fill={hue} />
              {/* A pale core down the middle of the ribbon, not a white one:
                  over pale streets pure white vanished into the ground it
                  was supposed to be lifting off. */}
              <path d={d.spine} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1} fill="none" />
              {d.leaves.map((l) => (
                <g key={l.member.id}>
                  <line x1={l.ax} y1={l.ay} x2={l.x} y2={l.y} stroke={hue} strokeOpacity={0.6} strokeWidth={1.5} />
                  <circle cx={l.ax} cy={l.ay} r={5.5} fill={hue} fillOpacity={0.28} />
                  <circle cx={l.ax} cy={l.ay} r={2.6} fill={hue} />
                </g>
              ))}
            </g>
            </g>
          );
        })}
      </svg>

      {boxW > 0 &&
        drawn.map((d, i) => {
          const hue = d.branch.discipline.hue;
          const dim = lit != null && lit !== d.branch.discipline.id;
          return (
            <div key={d.branch.discipline.id} style={{ opacity: dim ? 0.22 : 1, transition: "opacity 200ms ease" }}>
              {/*
               * The label is also the door into the list, so it survives
               * every width — on a phone it drops the discipline's name
               * and keeps its glyph and its count, which is the part that
               * cannot be inferred from the colour of the branch it is
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
                  animationDelay: `${260 + i * 90}ms`,
                  padding: roomy ? `${Math.round(5 * k)}px ${Math.round(12 * k)}px` : "3px 8px",
                  fontSize: roomy ? Math.max(10.5, 13 * k) : 11,
                  // Light chrome, like everything else floating on this
                  // map. The near-black chip was built to sit in the dark
                  // pool that has gone, and on pale streets it read as a
                  // hole punched through the picture.
                  background: "color-mix(in srgb, var(--card) 94%, transparent)",
                  color: hue,
                  border: `1px solid ${lit === d.branch.discipline.id ? hue : `${hue}66`}`,
                  boxShadow:
                    lit === d.branch.discipline.id
                      ? `0 0 0 3px ${hue}22, var(--shadow-lift)`
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
              {d.leaves.map((l, j) => (
                <span
                  key={l.member.id}
                  className="tree-leaf hover-host absolute block"
                  style={{
                    left: `${(l.x / W) * 100}%`,
                    top: `${(l.y / H) * 100}%`,
                    animationDelay: `${320 + i * 90 + j * 55}ms`,
                  }}
                >
                  <MemberHoverCard m={l.member} />
                  <button
                    type="button"
                    onClick={() => onPerson?.(l.member)}
                    title={`${l.member.name} — ${l.member.headline}`}
                    className="tree-face block rounded-full"
                    style={{
                      boxShadow: `0 0 0 ${Math.max(1.5, 2.4 * k)}px ${hue}, 0 0 ${Math.round(22 * k)}px ${hue}55`,
                    }}
                  >
                    {/* The drawn characters, not initials. Thirty faces is
                        well inside what the art service answers for, and
                        the faces are the entire reason anybody looks at
                        this rather than at the list. */}
                    <Avatar name={l.member.name} size={face} />
                  </button>
                </span>
              ))}
            </div>
          );
        })}
    </div>
  );
}
