"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SPACE_ENTITY_ID, WORKSPACE_ENTITY_ID, membersOf, type CircleMember } from "@/lib/circleData";
import { entityById } from "@/lib/networks";
import { branchesFor, DISCIPLINES } from "@/lib/treeData";
import { HEROES, IMAGINED_TOTAL, projectPct, regionSplit, worldPins } from "@/lib/worldData";
import Avatar from "./Avatar";
import GrowingTree from "./GrowingTree";

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
  const branches = useMemo(() => branchesFor(people), [people]);

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
          people={people}
          branchCount={branches.length}
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
  people,
  branchCount,
  only,
  onOnly,
  onPick,
  roomId,
  onRoom,
}: {
  people: CircleMember[];
  branchCount: number;
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
          <strong className="opacity-100">{people.length}</strong> people, on {branchCount} branches. Tap a
          branch to hold it.
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

      <GrowingTree
        className="mt-3 w-full overflow-hidden rounded-3xl"
        style={{ background: "#0d1326" }}
        people={people}
        highlight={only}
        onBranch={(id) => onOnly(only === id ? null : id)}
        onPerson={onPick}
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {DISCIPLINES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onOnly(only === d.id ? null : d.id)}
            className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
            style={
              only === d.id
                ? { background: `${d.hue}26`, color: d.hue, border: `1px solid ${d.hue}` }
                : { background: "#141c33", color: "#8da0c8", border: "1px solid transparent" }
            }
          >
            {d.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[12px] leading-[1.5] opacity-55">
        Four faces a branch, the rest counted in the label. The branch somebody hangs from is read off their
        headline, so it is occasionally wrong — and visibly so, which is the point of putting it on a picture
        rather than in a filter.
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
