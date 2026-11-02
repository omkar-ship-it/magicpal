"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SPACE_ENTITY_ID, WORKSPACE_ENTITY_ID, membersOf, type CircleMember } from "@/lib/circleData";
import { entityById } from "@/lib/networks";
import { branchesFor, layout, rootPaths, trunkPath, type Drawn } from "@/lib/treeData";
import { HEROES, IMAGINED_TOTAL, projectPct, regionSplit, worldPins } from "@/lib/worldData";
import Avatar from "./Avatar";

/**
 * Two pictures of the same problem, at opposite ends of the scale.
 *
 * The map answers "who is near me" and stops answering it twice: at a
 * million people it is a solid block of pins, and at four hundred in one
 * building it is a solid block of pins again. Both ends currently resolve
 * to a filtered list, which is correct and which nobody has ever sent to a
 * friend.
 *
 * So this route tries the other thing. Neither view replaces the
 * directory — they are the answer to "what is this place", where the list
 * is the answer to "find me a backend engineer", and the last four
 * attempts went wrong by trying to make one surface do both.
 */

const W = 1000;
const H = 700;

const ROOMS = [
  { id: SPACE_ENTITY_ID, label: "2gethr" },
  { id: WORKSPACE_ENTITY_ID, label: "WeWork Galaxy" },
];

export default function CircleTree() {
  const [view, setView] = useState<"tree" | "world">("tree");
  const [roomId, setRoomId] = useState(SPACE_ENTITY_ID);
  const [picked, setPicked] = useState<CircleMember | null>(null);
  const [only, setOnly] = useState<string | null>(null);

  const people = useMemo(() => membersOf(roomId), [roomId]);
  const room = entityById(roomId);
  const drawn = useMemo(() => layout(branchesFor(people), W, H), [people]);
  const shown = only ? drawn.filter((d) => d.branch.discipline.id === only) : drawn;

  return (
    <div className="min-h-dvh" style={{ background: "#0b1020", color: "#e9eef8" }}>
      <header className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-2 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.14em] opacity-50">OPENNETWORKS · PROTOTYPE</p>
          <h1 className="mt-0.5 text-[19px] font-semibold">
            {view === "tree" ? room?.name ?? "This room" : "The whole map"}
          </h1>
        </div>

        <span className="flex items-center gap-0.5 rounded-full p-0.5" style={{ background: "#172038" }}>
          {(["tree", "world"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
              style={view === v ? { background: "#2b3a60", color: "#fff" } : { color: "#8da0c8" }}
            >
              {v === "tree" ? "The room" : "The world"}
            </button>
          ))}
        </span>
      </header>

      {view === "tree" ? (
        <TreeView
          drawn={shown}
          all={drawn}
          total={people.length}
          only={only}
          onOnly={setOnly}
          onPick={setPicked}
          roomId={roomId}
          onRoom={setRoomId}
        />
      ) : (
        <WorldView />
      )}

      {picked && <Card m={picked} onClose={() => setPicked(null)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ the room */

function TreeView({
  drawn,
  all,
  total,
  only,
  onOnly,
  onPick,
  roomId,
  onRoom,
}: {
  drawn: Drawn[];
  all: Drawn[];
  total: number;
  only: string | null;
  onOnly: (id: string | null) => void;
  onPick: (m: CircleMember) => void;
  roomId: string;
  onRoom: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-16">
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-[13px] opacity-60">
          <strong className="opacity-100">{total}</strong> people, on {all.length} branches. Tap a branch to
          keep only that one.
        </p>
        <span className="ml-auto flex gap-1">
          {ROOMS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onRoom(r.id);
                onOnly(null);
              }}
              className="rounded-full px-2.5 py-1 text-[11.5px] font-medium"
              style={roomId === r.id ? { background: "#2b3a60", color: "#fff" } : { color: "#8da0c8", background: "#172038" }}
            >
              {r.label}
            </button>
          ))}
        </span>
      </div>

      <div className="relative mt-3 w-full overflow-hidden rounded-3xl" style={{ background: "#0d1326", aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="trunk" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#f6b46b" stopOpacity="0.95" />
              <stop offset="1" stopColor="#ffd9a3" stopOpacity="0.5" />
            </linearGradient>
            <radialGradient id="ground">
              <stop offset="0" stopColor="#f6b46b" stopOpacity="0.4" />
              <stop offset="1" stopColor="#f6b46b" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* The light it stands in, so the trunk has somewhere to come from. */}
          <ellipse cx={W / 2} cy={H * 0.965} rx={W * 0.3} ry={H * 0.035} fill="url(#ground)" />

          {/* Roots first, so the trunk sits on top of where they meet. */}
          {rootPaths(W, H).map((d, i) => (
            <path key={i} d={d} stroke="url(#trunk)" strokeOpacity={0.5} strokeWidth={7} fill="none" strokeLinecap="round" />
          ))}
          <path d={trunkPath(W, H)} fill="url(#trunk)" />

          {drawn.map((d) => (
            <g key={d.branch.discipline.id}>
              {/* Drawn twice: a wide, faint pass for the glow and a crisp one
                  over it. A filter would be prettier and costs a raster pass
                  per branch on every resize. */}
              <path d={d.path} stroke={d.branch.discipline.hue} strokeOpacity={0.22} strokeWidth={10} fill="none" strokeLinecap="round" />
              <path d={d.path} stroke={d.branch.discipline.hue} strokeOpacity={0.95} strokeWidth={2.4} fill="none" strokeLinecap="round" />
              {d.leaves.map((l) => (
                <g key={l.member.id}>
                  <line x1={l.ax} y1={l.ay} x2={l.x} y2={l.y} stroke={d.branch.discipline.hue} strokeOpacity={0.5} strokeWidth={1.6} />
                  <circle cx={l.ax} cy={l.ay} r={4.5} fill={d.branch.discipline.hue} fillOpacity={0.25} />
                  <circle cx={l.ax} cy={l.ay} r={2.2} fill={d.branch.discipline.hue} />
                </g>
              ))}
            </g>
          ))}
        </svg>

        {/* Faces and labels as HTML over the drawing: the avatars are the
            product's own component, with its photo and initials fallbacks,
            and re-implementing that inside SVG would be a second one to
            keep in step. Positioned in percentages off the same viewBox,
            so the two layers cannot drift apart. */}
        {drawn.map((d) => (
          <div key={d.branch.discipline.id}>
            <button
              type="button"
              onClick={() => onOnly(only === d.branch.discipline.id ? null : d.branch.discipline.id)}
              className="absolute -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold"
              style={{
                left: `${(d.tip.x / W) * 100}%`,
                top: `${(d.tip.y / H) * 100}%`,
                transform: `translate(${d.branch.side < 0 ? "-100%" : "0"}, -50%)`,
                marginLeft: d.branch.side < 0 ? -14 : 14,
                background: "#111a30",
                color: d.branch.discipline.hue,
                border: `1px solid ${d.branch.discipline.hue}`,
                boxShadow: `0 0 18px ${d.branch.discipline.hue}40`,
              }}
            >
              <span className="mono mr-1.5 opacity-70">{d.branch.discipline.icon}</span>
              {d.branch.discipline.label}
              <span className="ml-1.5 opacity-60">{d.branch.people.length}</span>
            </button>

            {d.leaves.map((l) => (
              <button
                key={l.member.id}
                type="button"
                onClick={() => onPick(l.member)}
                title={`${l.member.name} — ${l.member.headline}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-110"
                style={{
                  left: `${(l.x / W) * 100}%`,
                  top: `${(l.y / H) * 100}%`,
                  boxShadow: `0 0 0 2px ${d.branch.discipline.hue}, 0 0 22px ${d.branch.discipline.hue}66`,
                  borderRadius: 999,
                }}
              >
                <Avatar name={l.member.name} size={40} />
              </button>
            ))}

            {d.hidden > 0 && (
              <span
                className="absolute whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold"
                style={{
                  left: `${(d.tip.x / W) * 100}%`,
                  top: `${((d.tip.y + 40) / H) * 100}%`,
                  // Under its own label and on the same side, rather than
                  // dropped straight down onto whichever face is below.
                  transform: `translate(${d.branch.side < 0 ? "-100%" : "0"}, -50%)`,
                  marginLeft: d.branch.side < 0 ? -14 : 14,
                  background: "#111a30",
                  color: d.branch.discipline.hue,
                  border: `1px solid ${d.branch.discipline.hue}55`,
                }}
              >
                +{d.hidden} more
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[12px] leading-[1.5] opacity-55">
        Six faces a branch, the rest counted. The branch somebody hangs from is read off their headline, so
        it is occasionally wrong — and visibly so, which is the point of putting it on a picture rather than
        in a filter.
      </p>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════ the world */

/**
 * A million people, drawn.
 *
 * Canvas rather than SVG: this is eight thousand little shapes that never
 * need to be hit-tested or animated individually, which is the one case
 * where the DOM is the wrong container.
 */
function WorldView() {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [stage, setStage] = useState(0);
  const regions = useMemo(() => regionSplit(), []);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const draw = () => {
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(rect.width * dpr);
      el.height = Math.round(rect.height * dpr);
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // More pins the further in you go, which is the whole illusion: the
      // world does not gain people, it stops hiding them.
      const density = [26000, 34000, 42000][stage];
      const scale = [1, 1.45, 2.1][stage];
      const pins = worldPins(density, rect.width * scale, rect.height * scale);
      const ox = (rect.width - rect.width * scale) / 2;
      const oy = (rect.height - rect.height * scale) * 0.45;

      for (const p of pins) {
        const x = p.x + ox;
        const y = p.y + oy;
        if (x < -8 || y < -8 || x > rect.width + 8 || y > rect.height + 8) continue;
        const r = p.big ? 2.8 : 1.45;
        ctx.beginPath();
        // A teardrop: a disc with a point under it, which is what makes a
        // field of dots read as a map of pins.
        ctx.arc(x, y, r, Math.PI, 0);
        ctx.lineTo(x, y + r * 2.2);
        ctx.closePath();
        ctx.fillStyle = p.hue === 1 ? "#19b5a0" : "#ff7a1a";
        ctx.globalAlpha = p.big ? 0.95 : 0.7;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage]);

  const label = ["The whole world", "Zoomed to a continent", "Zoomed to a region"][stage];

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-16">
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[28px] font-semibold tabular-nums">{IMAGINED_TOTAL.toLocaleString("en-IN")}</p>
        <p className="text-[13px] opacity-60">people on the map · {label}</p>
        <span className="ml-auto flex items-center gap-0.5 rounded-full p-0.5" style={{ background: "#172038" }}>
          {["World", "Continent", "Region"].map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(i)}
              className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              style={stage === i ? { background: "#2b3a60", color: "#fff" } : { color: "#8da0c8" }}
            >
              {s}
            </button>
          ))}
        </span>
      </div>

      <div className="relative mt-3 w-full overflow-hidden rounded-3xl" style={{ background: "#0a0f1e", aspectRatio: "16 / 9" }}>
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
        {/* Only at world scale. Zoomed in they would be eight arbitrary
            people floating over a region they have nothing to do with. */}
        {stage === 0 &&
          HEROES.map((hero) => {
            const at = projectPct(hero.lat, hero.lng);
            return (
              <span
                key={hero.name}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${at.x}%`, top: `${at.y}%` }}
                title={hero.name}
              >
                <span
                  className="block rounded-full"
                  style={{ boxShadow: "0 0 0 2.5px #ff7a1a, 0 0 26px #ff7a1a55", borderRadius: 999 }}
                >
                  <Avatar name={hero.name} size={34} />
                </span>
              </span>
            );
          })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {regions.map((r) => (
          <span
            key={r.name}
            className="rounded-full px-3 py-1.5 text-[12px]"
            style={{ background: "#141c33", color: "#b9c8e6" }}
          >
            {r.name} <strong className="ml-1 tabular-nums">{r.n.toLocaleString("en-IN")}</strong>
          </span>
        ))}
      </div>

      <p className="mt-3 text-[12px] leading-[1.5] opacity-55">
        No basemap. At this scale a coastline is a picture with dots on it, and the thing worth showing is
        the opposite — the world drawn by the people, with land implied by where they are. The number is
        invented; the cities under it are real, and the field is deterministic, so this is the same world on
        every screen it opens on.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ a face */

function Card({ m, onClose }: { m: CircleMember; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(5,8,18,0.6)" }} />
      <div
        className="relative m-3 w-full max-w-[380px] rounded-3xl p-5"
        style={{ background: "#121a30", border: "1px solid #24314f" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <Avatar name={m.name} size={54} ring={2} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold">{m.name}</p>
            <p className="text-[12.5px] opacity-60">
              {m.headline} · {m.company}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[13px] opacity-50 hover:opacity-100">
            ✕
          </button>
        </div>

        {m.lookingFor && (
          <p className="mt-3 rounded-xl p-2.5 text-[12.5px]" style={{ background: "#0d1527" }}>
            <span className="opacity-55">Looking for </span>
            {m.lookingFor}
          </p>
        )}
        {m.helpWith.length > 0 && (
          <p className="mt-2 text-[12px] opacity-70">
            <span className="opacity-60">Can help with </span>
            {m.helpWith.slice(0, 3).join(" · ")}
          </p>
        )}
        <p className="mt-3 text-[11.5px] opacity-45">Prototype — this card is where the real profile opens.</p>
      </div>
    </div>
  );
}
