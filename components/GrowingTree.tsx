"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CircleMember } from "@/lib/circleData";
import { branchesFor, layout, leavesFor, trunkFor } from "@/lib/treeData";
import Avatar from "./Avatar";

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
          <linearGradient id={`bark-${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#f4a63f" />
            <stop offset="0.55" stopColor="#ffc877" />
            <stop offset="1" stopColor="#ffe9bd" />
          </linearGradient>
          <radialGradient id={`pool-${uid}`}>
            <stop offset="0" stopColor="#ffb867" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffb867" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* The light it stands in, so the trunk has somewhere to come from. */}
        <ellipse
          className="tree-breathe"
          cx={W / 2}
          cy={trunk.glowY}
          rx={W * 0.33}
          ry={H * 0.045}
          fill={`url(#pool-${uid})`}
        />

        <g filter={`url(#glow-${uid})`} opacity={0.5}>
          {trunk.roots.map((d, i) => (
            <path key={i} d={d} fill="#ffb867" opacity={0.7} />
          ))}
          <path d={trunk.body} fill="#ffb867" />
          {drawn.map((d) => (
            <path
              key={d.branch.discipline.id}
              d={d.body}
              fill={d.branch.discipline.hue}
              opacity={highlight && highlight !== d.branch.discipline.id ? 0.12 : 1}
            />
          ))}
        </g>

        {/* The crisp pass over the glow. */}
        {trunk.roots.map((d, i) => (
          <path key={i} d={d} fill={`url(#bark-${uid})`} opacity={0.8} />
        ))}
        <path d={trunk.body} fill={`url(#bark-${uid})`} />
        {trunk.strands.map((d, i) => (
          <path key={i} d={d} fill="#fff6e0" opacity={0.5} />
        ))}

        {drawn.map((d, i) => {
          const hue = d.branch.discipline.hue;
          const dim = highlight != null && highlight !== d.branch.discipline.id;
          return (
            <g
              key={d.branch.discipline.id}
              className="tree-limb"
              style={{ animationDelay: `${120 + i * 90}ms`, opacity: dim ? 0.16 : undefined }}
            >
              <path d={d.body} fill={hue} />
              <path d={d.spine} stroke="#ffffff" strokeOpacity={0.4} strokeWidth={1.1} fill="none" />
              {d.leaves.map((l) => (
                <g key={l.member.id}>
                  <line x1={l.ax} y1={l.ay} x2={l.x} y2={l.y} stroke={hue} strokeOpacity={0.55} strokeWidth={1.6} />
                  <circle cx={l.ax} cy={l.ay} r={5.5} fill={hue} fillOpacity={0.3} />
                  <circle cx={l.ax} cy={l.ay} r={2.4} fill="#ffffff" />
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      {boxW > 0 &&
        drawn.map((d, i) => {
          const hue = d.branch.discipline.hue;
          const dim = highlight != null && highlight !== d.branch.discipline.id;
          return (
            <div key={d.branch.discipline.id} style={{ opacity: dim ? 0.22 : 1, transition: "opacity 200ms" }}>
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
                  background: "rgba(10,15,31,0.86)",
                  color: hue,
                  border: `1px solid ${hue}`,
                  boxShadow: `0 0 ${Math.max(10, Math.round(22 * k))}px ${hue}55`,
                  backdropFilter: "blur(6px)",
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

              {d.leaves.map((l, j) => (
                <button
                  key={l.member.id}
                  type="button"
                  onClick={() => onPerson?.(l.member)}
                  title={`${l.member.name} — ${l.member.headline}`}
                  className="tree-face absolute rounded-full"
                  style={{
                    left: `${(l.x / W) * 100}%`,
                    top: `${(l.y / H) * 100}%`,
                    animationDelay: `${320 + i * 90 + j * 55}ms`,
                    boxShadow: `0 0 0 ${Math.max(1.5, 2.4 * k)}px ${hue}, 0 0 ${Math.round(26 * k)}px ${hue}70`,
                  }}
                >
                  {/* The drawn characters, not initials. Thirty faces is
                      well inside what the art service answers for, and the
                      faces are the entire reason anybody looks at this
                      rather than at the list. */}
                  <Avatar name={l.member.name} size={face} />
                </button>
              ))}
            </div>
          );
        })}
    </div>
  );
}
