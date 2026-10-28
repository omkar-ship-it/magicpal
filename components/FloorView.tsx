"use client";

import { useEffect, useMemo, useState } from "react";
import type { CircleMember } from "@/lib/circleData";
import { rnd } from "@/lib/circleData";
import type { CircleMe } from "@/lib/circleMe";
import Avatar from "./Avatar";
import {
  AGENDA_IDEAS,
  PIN_MINUTES,
  PIN_REACH,
  deskOf,
  seedPins,
  type Desk,
  type Floor,
  type FloorPin,
  type PinReach,
  type Zone,
  type ZoneKind,
} from "@/lib/floorData";

/**
 * The building, sliced open.
 *
 * The crowd view puts you at the centre and sorts four hundred people
 * outward, which is the right answer when the map knows nothing about where
 * it is pointed. It is also, drawn, four hundred anonymous discs: a picture
 * of a ranking, and a ranking only you can see.
 *
 * A declared building gives us something better than a ranking — a shared
 * frame. Six levels and thirty rooms divide four hundred people into groups
 * of a dozen, which is a number a person can actually read; "Tessellate, L3"
 * is checkable in a way that "fourth ring" never is; and it is the form the
 * answer has to take anyway, because the question in a co-working space is
 * never "who is nearest" but "where do I go".
 *
 * Two depths, and no more. The cutaway is the whole building at once — every
 * person, every level, nothing hidden. A floor opens into its plan. Anything
 * past that is a desk-level map of a building nobody surveyed, and would be
 * invented detail dressed as fact.
 */

type Tier = "lead" | "mid" | "rest";

const ZONE_TINT: Record<ZoneKind, number> = {
  desks: 5,
  meeting: 10,
  pantry: 14,
  lounge: 12,
  booth: 10,
  event: 12,
  reception: 8,
  core: 22,
};

/** Draw order inside a room: the people you came for, then the room. */
const RANK: Record<Tier, number> = { lead: 0, mid: 1, rest: 2 };

/** Rooms you go to rather than sit in — the places a pin belongs. */
const SOCIAL: ZoneKind[] = ["pantry", "lounge", "event", "meeting", "reception"];

export default function FloorView({
  floors,
  entityId,
  crowd,
  tierOf,
  me,
  myDesk,
  onSetDesk,
  onOpenMember,
  dim,
}: {
  floors: Floor[];
  entityId: string;
  crowd: CircleMember[];
  tierOf: (id: string) => Tier;
  me: CircleMe | null;
  myDesk: Desk | null;
  onSetDesk: (d: Desk) => void;
  onOpenMember: (id: string) => void;
  /** Search dims rather than hides — nobody drops out of the building. */
  dim: (m: CircleMember) => boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [pins, setPins] = useState<FloorPin[]>(() => seedPins(crowd));
  const [composeAt, setComposeAt] = useState<{ floorId: string; zone: Zone } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /** Everyone, bucketed by the desk they declared. Computed once per crowd. */
  const { byZone, byFloor } = useMemo(() => {
    const byZone = new Map<string, CircleMember[]>();
    const byFloor = new Map<string, CircleMember[]>();
    for (const m of crowd) {
      const d = deskOf(entityId, m.id);
      if (!d) continue;
      const z = byZone.get(d.zoneId) ?? [];
      z.push(m);
      byZone.set(d.zoneId, z);
      const f = byFloor.get(d.floorId) ?? [];
      f.push(m);
      byFloor.set(d.floorId, f);
    }
    return { byZone, byFloor };
  }, [crowd, entityId]);

  const leadCount = (list: CircleMember[]) => list.filter((m) => tierOf(m.id) !== "rest").length;
  const pinsOn = (floorId: string) => pins.filter((p) => p.floorId === floorId);

  /**
   * People arriving at your pin.
   *
   * A pin that goes up and sits there is a status update. The whole claim of
   * the feature is that somebody walks over — so the prototype shows that
   * happening, on a timer, rather than asking a co-working owner to imagine
   * it. Async inside the effect, never during render.
   */
  useEffect(() => {
    const mine = pins.find((p) => p.mine);
    if (!mine || mine.joinedIds.length >= 3) return;
    const pool = crowd.filter((m) => !mine.joinedIds.includes(m.id));
    if (pool.length === 0) return;
    const pick = pool[rnd(`join-${mine.id}-${mine.joinedIds.length}`) % pool.length];
    const t = window.setTimeout(() => {
      setPins((ps) => ps.map((p) => (p.id === mine.id ? { ...p, joinedIds: [...p.joinedIds, pick.id] } : p)));
      setToast(`${pick.name.split(" ")[0]} is on their way.`);
    }, 2400 + mine.joinedIds.length * 3600);
    return () => window.clearTimeout(t);
  }, [pins, crowd]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const floor = open ? floors.find((f) => f.id === open) ?? null : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* ------------------------------------------------------- the header */}
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-[var(--line)] px-3 py-2">
        {floor ? (
          <button
            type="button"
            onClick={() => {
              setOpen(null);
              setPicking(false);
            }}
            className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
            style={{ background: "var(--sunk)" }}
          >
            ← Whole building
          </button>
        ) : (
          <span className="text-[11.5px] text-[var(--ink-soft)]">
            {floors.length} levels, declared by the building. Floors are what people tell us, never
            what we track.
          </span>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-[11.5px] text-[var(--ink-soft)]">
            {myDesk
              ? `Your desk · ${floors.find((f) => f.id === myDesk.floorId)?.name ?? ""} ${
                  floors.flatMap((f) => f.zones).find((z) => z.id === myDesk.zoneId)?.name ?? ""
                }`
              : "No desk set"}
          </span>
          <button
            type="button"
            onClick={() => {
              setPicking((v) => !v);
              if (!floor) setOpen(myDesk?.floorId ?? floors[1]?.id ?? floors[0].id);
            }}
            className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
            style={picking ? { background: "var(--brand)", color: "#fff" } : { background: "var(--sunk)" }}
          >
            {picking ? "Pick a room…" : myDesk ? "Change" : "Set my desk"}
          </button>
        </span>
      </div>

      {/* Bottom padding clears the dock, which floats above this panel —
          without it the pantry and the rooms along the back wall sit under it
          and can't be clicked at all. */}
      <div className="scroll-clean min-h-0 flex-1 overflow-y-auto p-3 pb-24">
        {floor ? (
          <Plan
            floor={floor}
            byZone={byZone}
            pins={pinsOn(floor.id)}
            tierOf={tierOf}
            dim={dim}
            myDesk={myDesk}
            picking={picking}
            onOpenMember={onOpenMember}
            onPickDesk={(zone) => {
              onSetDesk({ floorId: floor.id, zoneId: zone.id });
              setPicking(false);
              setToast(`Desk set — ${floor.name} ${zone.name}. Only this board sees it.`);
            }}
            onPin={(zone) => setComposeAt({ floorId: floor.id, zone })}
          />
        ) : (
          <Cutaway
            floors={floors}
            byZone={byZone}
            byFloor={byFloor}
            leadCount={leadCount}
            pinsOn={pinsOn}
            tierOf={tierOf}
            dim={dim}
            myDesk={myDesk}
            onOpen={setOpen}
            onOpenMember={onOpenMember}
          />
        )}
      </div>

      {composeAt && (
        <Compose
          floor={floors.find((f) => f.id === composeAt.floorId)!}
          zone={composeAt.zone}
          crowd={crowd}
          me={me}
          byFloor={byFloor}
          tierOf={tierOf}
          onCancel={() => setComposeAt(null)}
          onDrop={(agenda, minutes, reach, notified) => {
            setPins((ps) => [
              ...ps.filter((p) => !p.mine),
              {
                id: `pin-mine-${Date.now()}`,
                floorId: composeAt.floorId,
                zoneId: composeAt.zone.id,
                byId: null,
                byName: me?.name ?? "You",
                agenda,
                minutes,
                reach,
                notified,
                joinedIds: [],
                age: 0,
                mine: true,
              },
            ]);
            setComposeAt(null);
            setToast(`Pinned at ${composeAt.zone.name} — ${notified} people notified.`);
          }}
        />
      )}

      {toast && (
        <div
          className="float-in pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full border px-3.5 py-2 text-[12px] font-semibold"
          style={{ background: "var(--card)", borderColor: "var(--brand)", boxShadow: "var(--shadow-lift)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ==================================================== the whole building */

/**
 * Every level at once, in section.
 *
 * Drawn top-down so the terrace is at the top and the lobby at the bottom,
 * because that is where they are — a stack that reads in any other order is
 * a chart pretending to be a building. The lift core sits at identical
 * coordinates on every level, which is the detail that fuses six bands into
 * one structure.
 */
function Cutaway({
  floors,
  byZone,
  byFloor,
  leadCount,
  pinsOn,
  tierOf,
  dim,
  myDesk,
  onOpen,
  onOpenMember,
}: {
  floors: Floor[];
  byZone: Map<string, CircleMember[]>;
  byFloor: Map<string, CircleMember[]>;
  leadCount: (list: CircleMember[]) => number;
  pinsOn: (floorId: string) => FloorPin[];
  tierOf: (id: string) => Tier;
  dim: (m: CircleMember) => boolean;
  myDesk: Desk | null;
  onOpen: (floorId: string) => void;
  onOpenMember: (id: string) => void;
}) {
  const stack = [...floors].sort((a, b) => b.level - a.level);
  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <div className="bld-roof" />
      {stack.map((f) => {
        const here = byFloor.get(f.id) ?? [];
        const worth = leadCount(here);
        const livePins = pinsOn(f.id);
        const mine = myDesk?.floorId === f.id;
        return (
          <div key={f.id} className="bld-floor" data-mine={mine || undefined}>
            <button
              type="button"
              onClick={() => onOpen(f.id)}
              className="bld-tag"
              title={`Open the ${f.name} plan`}
            >
              <span className="bld-tag-name">{f.name}</span>
              <span className="bld-tag-title">{f.title}</span>
            </button>

            <div className="bld-slab">
              {[...f.zones]
                .sort((a, b) => a.x - b.x)
                .map((z) => {
                  const people = byZone.get(z.id) ?? [];
                  const pin = livePins.find((p) => p.zoneId === z.id);
                  return (
                    <div
                      key={z.id}
                      className="bld-room"
                      style={{ flexGrow: z.w, background: `color-mix(in srgb, var(--ink) ${ZONE_TINT[z.kind]}%, transparent)` }}
                      data-core={z.kind === "core" || undefined}
                    >
                      <span className="bld-room-name">{z.kind === "core" ? "" : z.name}</span>
                      <span className="bld-dots">
                        {people.map((m) => {
                          const t = tierOf(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => onOpenMember(m.id)}
                              className="bld-dot"
                              data-tier={t}
                              title={`${m.name} — ${m.headline}, ${m.company}`}
                              style={{ opacity: dim(m) ? 0.14 : undefined }}
                            />
                          );
                        })}
                      </span>
                      {pin && <span className="bld-pin" title={pin.agenda} />}
                    </div>
                  );
                })}
            </div>

            <div className="bld-meta">
              <span className="mono bld-meta-n">{here.length}</span>
              {worth > 0 && <span className="bld-meta-worth">{worth} for you</span>}
              {livePins.length > 0 && <span className="bld-meta-pin">{livePins.length} pinned</span>}
            </div>
          </div>
        );
      })}
      <div className="bld-ground" />
      <p className="mt-2 text-center text-[11px] text-[var(--ink-soft)]">
        Each dot is one person at the desk they declared. Pick a level to open its plan.
      </p>
    </div>
  );
}

/* ========================================================= one floor */

function Plan({
  floor,
  byZone,
  pins,
  tierOf,
  dim,
  myDesk,
  picking,
  onOpenMember,
  onPickDesk,
  onPin,
}: {
  floor: Floor;
  byZone: Map<string, CircleMember[]>;
  pins: FloorPin[];
  tierOf: (id: string) => Tier;
  dim: (m: CircleMember) => boolean;
  myDesk: Desk | null;
  picking: boolean;
  onOpenMember: (id: string) => void;
  onPickDesk: (z: Zone) => void;
  onPin: (z: Zone) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <p className="mb-2 text-[12.5px]">
        <span className="font-semibold">
          {floor.name} · {floor.title}
        </span>{" "}
        <span className="text-[var(--ink-soft)]">{floor.blurb}</span>
      </p>

      <div className="plan">
        {floor.zones.map((z) => {
          const people = byZone.get(z.id) ?? [];
          const pin = pins.find((p) => p.zoneId === z.id);
          const social = SOCIAL.includes(z.kind);
          const canDesk = picking && z.seats > 0;
          return (
            <div
              key={z.id}
              className="plan-room"
              data-core={z.kind === "core" || undefined}
              data-mine={myDesk?.zoneId === z.id || undefined}
              style={{
                left: `${z.x}%`,
                top: `${(z.y / 64) * 100}%`,
                width: `${z.w}%`,
                height: `${(z.h / 64) * 100}%`,
                background: `color-mix(in srgb, var(--ink) ${ZONE_TINT[z.kind]}%, transparent)`,
              }}
            >
              <span className="plan-room-head">
                <span className="plan-room-name">{z.name}</span>
                {people.length > 0 && <span className="mono plan-room-n">{people.length}</span>}
              </span>

              {/* Faces first, then the room. Sorted so the people you came
                  for sit at the top-left of the block rather than scattered
                  through it — the plan has to answer "where do I go" in one
                  look or it is just a prettier list. */}
              <span className="plan-people">
                {[...people]
                  .sort((a, b) => RANK[tierOf(a.id)] - RANK[tierOf(b.id)])
                  .map((m) =>
                    tierOf(m.id) === "lead" ? (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onOpenMember(m.id)}
                        className="plan-face"
                        title={`${m.name} — ${m.headline}, ${m.company}`}
                        style={{ opacity: dim(m) ? 0.14 : undefined }}
                      >
                        <Avatar name={m.name} size={22} ring={2} local />
                        <span className="plan-face-name" style={{ color: "var(--brand)" }}>
                          {m.name.split(" ")[0]}
                        </span>
                      </button>
                    ) : (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onOpenMember(m.id)}
                        className="plan-dot"
                        data-tier={tierOf(m.id)}
                        title={`${m.name} — ${m.headline}, ${m.company}`}
                        style={{ opacity: dim(m) ? 0.14 : undefined }}
                      />
                    )
                  )}
              </span>

              {pin && <PinChip pin={pin} />}

              {canDesk && (
                <button type="button" className="plan-action" onClick={() => onPickDesk(z)}>
                  Sit here
                </button>
              )}
              {!picking && social && !pin && (
                <button type="button" className="plan-action" onClick={() => onPin(z)}>
                  Drop a pin
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-[var(--ink-soft)]">
        Desks are declared, not tracked. The only live position in here is a pin somebody chose to
        drop — and it expires on its own.
      </p>
    </div>
  );
}

function PinChip({ pin }: { pin: FloorPin }) {
  return (
    <span className="plan-pin">
      <span className="plan-pin-dot" />
      <span className="plan-pin-body">
        <span className="plan-pin-who">
          {pin.mine ? "You" : pin.byName.split(" ")[0]} · {pin.minutes} min
        </span>
        <span className="plan-pin-agenda">{pin.agenda}</span>
        <span className="plan-pin-meta">
          {pin.notified} notified
          {pin.joinedIds.length > 0 && ` · ${pin.joinedIds.length} coming`}
        </span>
      </span>
    </span>
  );
}

/* ========================================================= dropping one */

/**
 * Who hears about it.
 *
 * The same three-layer shape the rest of the product uses — the place is the
 * scope, this is the reach, and the agenda is the criteria — rather than a
 * new notification model that happens to live in a building. Every option
 * carries its live count, because "notify everyone" means something very
 * different at 12 people and at 318, and the person dropping the pin is the
 * only one who can judge that.
 */
function Compose({
  floor,
  zone,
  crowd,
  me,
  byFloor,
  tierOf,
  onCancel,
  onDrop,
}: {
  floor: Floor;
  zone: Zone;
  crowd: CircleMember[];
  me: CircleMe | null;
  byFloor: Map<string, CircleMember[]>;
  tierOf: (id: string) => Tier;
  onCancel: () => void;
  onDrop: (agenda: string, minutes: number, reach: PinReach, notified: number) => void;
}) {
  const [agenda, setAgenda] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [reach, setReach] = useState<PinReach>("building");

  const connected = new Set(me?.connectedIds ?? []);
  const counts: Record<PinReach, number> = {
    building: crowd.length,
    floor: (byFloor.get(floor.id) ?? []).length,
    match: crowd.filter((m) => tierOf(m.id) !== "rest").length,
    connections: crowd.filter((m) => connected.has(m.id)).length,
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-3 py-6" style={{ background: "color-mix(in srgb, var(--ink) 28%, transparent)" }}>
      <div
        className="float-in w-full max-w-[460px] rounded-2xl border p-3"
        style={{ background: "var(--card)", borderColor: "var(--line)", boxShadow: "var(--shadow-lift)" }}
      >
        <p className="text-[13px] font-semibold">
          Drop a pin · {floor.name} {zone.name}
        </p>
        <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">
          Say what it&apos;s for. &ldquo;I&apos;m at the pantry&rdquo; isn&apos;t an invitation — an
          agenda is.
        </p>

        <input
          className="input mt-2 py-1.5 text-[12.5px]"
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="Coffee, 15 min — talking pricing"
          aria-label="What this pin is for"
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {AGENDA_IDEAS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAgenda(a)}
              className="rounded-full px-2 py-0.5 text-[10.5px]"
              style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}
            >
              {a}
            </button>
          ))}
        </div>

        <p className="mt-3 text-[11px] font-semibold text-[var(--ink-soft)]">Up for</p>
        <div className="mt-1 flex gap-1">
          {PIN_MINUTES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMinutes(n)}
              className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              style={minutes === n ? { background: "var(--brand)", color: "#fff" } : { background: "var(--sunk)" }}
            >
              {n} min
            </button>
          ))}
        </div>

        <p className="mt-3 text-[11px] font-semibold text-[var(--ink-soft)]">Who gets told</p>
        <div className="mt-1 flex flex-col gap-0.5">
          {PIN_REACH.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReach(r.id)}
              className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left"
              style={reach === r.id ? { background: "var(--sunk)" } : undefined}
            >
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold">
                  {reach === r.id && <span style={{ color: "var(--brand)" }}>● </span>}
                  {r.label}
                </span>
                <span className="block truncate text-[11px] text-[var(--ink-soft)]">{r.detail}</span>
              </span>
              <span className="mono flex-none text-[11.5px]" style={{ color: reach === r.id ? "var(--brand)" : "var(--ink-soft)" }}>
                {counts[r.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-1.5">
          <button type="button" onClick={onCancel} className="btn-ghost flex-none px-3 py-2 text-[12.5px]">
            Cancel
          </button>
          <button
            type="button"
            disabled={agenda.trim() === ""}
            onClick={() => onDrop(agenda.trim(), minutes, reach, counts[reach])}
            className="flex-1 rounded-xl px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--brand)" }}
          >
            Drop it — notifies {counts[reach]}
          </button>
        </div>
      </div>
    </div>
  );
}
