import type { CircleMember } from "./circleData";

/**
 * A crowded room, drawn as a tree.
 *
 * The directory answers a dense place correctly and looks like a database
 * while it does it. Nobody screenshots a filtered list, and for a
 * co-working space the thing that has to travel — to the next operator, to
 * a member's group chat — is a picture of the room that somebody wants to
 * send.
 *
 * So: one trunk, a branch per discipline, a face for every person hanging
 * off the branch they belong to. It reads in a second, it is obviously
 * *this* room and not a stock graphic, and the information it carries is
 * the one a person actually wants on walking in — what kind of people are
 * here, and how many of each.
 *
 * It is not a replacement for the list. A tree is the answer to "what is
 * this room", a list is the answer to "find me a backend engineer", and
 * pretending either does both is how the last four attempts went wrong.
 *
 * Everything below is geometry only, in abstract canvas units, so the same
 * numbers drive the tree growing out of a building on the map and the tree
 * on its own page. Two layouts would have drifted within a week.
 */

export type Discipline = {
  id: string;
  label: string;
  /** Drawn in this hue, and the branch glows with it. */
  hue: string;
  icon: string;
};

/**
 * Six, because the tree has to stay readable at a glance and because six is
 * roughly how many kinds of person a working floor actually contains. A
 * seventh branch costs more than the precision it buys.
 */
/**
 * Hues chosen to survive a near-white basemap.
 *
 * The first set was picked against a dark pool dimmed into the map
 * underneath. With that gone the tree is drawn straight onto Mapbox
 * light-v11, where a neon mint and a pastel lime are a smudge — so every
 * hue here is deep enough to hold its own line on paper, and still bright
 * enough to carry a glow on the dark standalone page.
 */
export const DISCIPLINES: Discipline[] = [
  { id: "eng", label: "Engineering", hue: "#7c5cf5", icon: "</>" },
  { id: "product", label: "Product", hue: "#ef8b22", icon: "◆" },
  { id: "design", label: "Design", hue: "#3aa94c", icon: "✺" },
  { id: "data", label: "AI & Data", hue: "#1f83e8", icon: "✦" },
  { id: "growth", label: "Marketing", hue: "#e8468f", icon: "◈" },
  { id: "business", label: "Business", hue: "#0f9f97", icon: "▤" },
];

export function disciplineById(id: string): Discipline {
  return DISCIPLINES.find((d) => d.id === id) ?? DISCIPLINES[DISCIPLINES.length - 1];
}

const RULES: Array<[string, RegExp]> = [
  ["data", /data|machine learning|\bml\b|\bai\b|analytics|research/i],
  ["eng", /engineer|cto|technical|platform|infra|developer|architect/i],
  ["design", /design|ux|\bui\b|brand|creative/i],
  ["growth", /growth|marketing|demand|content|community|talent|people/i],
  ["product", /product|programme|program manager|chief of staff/i],
  ["business", /founder|ceo|partner|invest|sales|revenue|gm|general manager|operating|strategy|finance|\bcoo\b/i],
];

/**
 * Which branch somebody hangs from.
 *
 * Keyword matching on the headline, in a deliberate order: "Head of Data"
 * is data before it is a head of anything, and "Founder & CEO" is business
 * rather than whatever their company builds. Wrong occasionally and
 * explainable always — and visible, since the face is sitting on the branch
 * where you can see it is wrong.
 */
export function disciplineOf(m: CircleMember): string {
  const text = `${m.headline} ${m.helpWith.join(" ")}`;
  for (const [id, re] of RULES) if (re.test(text)) return id;
  return "business";
}

export type Branch = {
  discipline: Discipline;
  people: CircleMember[];
  /** Which side of the trunk, and how far up it. */
  side: -1 | 1;
  tier: number;
};

/**
 * Branches, biggest nearest the ground.
 *
 * A real tree is thickest where it is oldest, and the eye reads bottom-up
 * on something trunk-shaped — so the discipline with the most people is the
 * lowest and longest, which puts the room's centre of gravity where the
 * picture is heaviest. Sides alternate so the thing stays balanced however
 * lopsided the room is.
 *
 * `rank` optionally orders the people within a branch — on the map it is
 * relevance to the reader, which is what makes the tree *yours* rather than
 * a chart of the building that is identical on every screen.
 */
export function branchesFor(
  people: CircleMember[],
  rank?: (a: CircleMember, b: CircleMember) => number
): Branch[] {
  const byId = new Map<string, CircleMember[]>();
  for (const m of people) {
    const id = disciplineOf(m);
    const list = byId.get(id) ?? [];
    list.push(m);
    byId.set(id, list);
  }

  return DISCIPLINES.map((d) => ({
    discipline: d,
    people: rank ? [...(byId.get(d.id) ?? [])].sort(rank) : (byId.get(d.id) ?? []),
  }))
    .filter((b) => b.people.length > 0)
    .sort((a, b) => b.people.length - a.people.length)
    .map((b, i) => ({
      ...b,
      side: (i % 2 === 0 ? -1 : 1) as -1 | 1,
      tier: Math.floor(i / 2),
    }));
}

/**
 * Faces drawn on a branch before the rest become a count.
 *
 * Four, arrived at by measurement rather than taste. A branch reaches
 * about a third of the canvas; a face is about a twentieth of it; faces
 * need roughly a quarter of their own width between them to read as
 * separate. That arithmetic allows four. Six and then five both put
 * overlapping discs on a branch — which is the pile-up this whole picture
 * exists to answer, reproduced inside the answer.
 *
 * The other hundred and twenty-one engineers are not hidden; they are the
 * number on the branch label, one tap from the list.
 *
 * On a phone it is three, for the same arithmetic against a narrower
 * canvas — see `leavesFor`.
 */
export const LEAVES = 4;

/**
 * How many faces a branch can hold at a given drawn width.
 *
 * A face has to stay tappable, so below about 560px it stops shrinking
 * with the picture — and a face that is no longer shrinking takes up more
 * of the branch, so one of them has to go. Three faces and a readable
 * count beats four faces that overlap.
 */
export function leavesFor(drawnWidth: number): number {
  return drawnWidth < 560 ? 3 : LEAVES;
}

/**
 * A face and the point it hangs from.
 *
 * Both, because the stem between them is what makes the picture read as a
 * tree rather than as avatars scattered near a curve — and the glowing dot
 * at the anchor is what says "this one belongs to this branch".
 */
export type Leaf = { member: CircleMember; x: number; y: number; ax: number; ay: number };

export type Drawn = {
  branch: Branch;
  /** The branch as a filled, tapering shape — see `ribbon`. */
  body: string;
  /** The same curve as a bare stroke, for the bright core down its middle. */
  spine: string;
  /** Where the label sits, just above the outer end. */
  tip: { x: number; y: number };
  leaves: Leaf[];
  hidden: number;
};

type Cubic = [number, number, number, number, number, number, number, number];

/**
 * Where each pair of branches leaves the trunk.
 *
 * The highest one is also where the trunk stops: the top pair *is* the
 * crown splitting, which is the shape every drawn tree has and the thing
 * the first draft was missing when it ran a bare spike up past the canopy.
 */
function forkY(h: number, tier: number) {
  return h * (0.845 - tier * 0.235);
}

/**
 * The geometry, in one place and in canvas units.
 *
 * Laid out against a fixed viewBox and scaled by the SVG rather than
 * measured from the DOM: the picture has to be identical in a screenshot,
 * on a phone, and in whatever somebody pastes it into.
 */
export function layout(branches: Branch[], w: number, h: number, perBranch = LEAVES): Drawn[] {
  const cx = w / 2;

  return branches.map((b) => {
    /**
     * Lowest branch is the longest, and every branch rises.
     *
     * The first draft forked them all from one point and ran them sideways,
     * which drew six power lines off two chopsticks. A branch leaves the
     * trunk at its own height and ends *above* where it started — that one
     * property is most of what makes a shape read as a tree.
     */
    const fy = forkY(h, b.tier);
    const reach = w * (0.315 - b.tier * 0.028);
    const tipX = cx + b.side * reach;
    /**
     * A branch goes out about three times as far as it goes up.
     *
     * Two drafts bracketed this. At a twentieth of the canvas they were
     * six eyebrows; at a third they all left the trunk at the same angle
     * and drew a wheat sheaf. A branch reaching outward with a modest
     * crest is both what a tree looks like and what opens the wedge of
     * space underneath — and that wedge is where the faces go, so the
     * number is load-bearing twice over.
     */
    const tipY = fy - h * (0.125 + b.tier * 0.01);

    const c: Cubic = [
      cx + b.side * 10,
      fy + h * 0.015,
      // Up and out of the trunk before it turns — but not so steeply that
      // six of them converge into a fan at the crown.
      cx + b.side * w * 0.1,
      fy - h * 0.055,
      // Pulled above the tip so the curve crests before it lands, which is
      // what gives a branch its droop at the end instead of a ramp.
      cx + b.side * reach * 0.7,
      tipY - h * 0.035,
      tipX,
      tipY,
    ];

    /**
     * Faces spread by distance along the branch, not by the curve's own
     * parameter.
     *
     * A cubic is not travelled at a constant rate: an even spread of `t`
     * put four of the five faces in the outer third, piled against the
     * label, with the whole inner half of the branch bare. Walking the arc
     * length is the difference between a decorated curve and a branch with
     * things growing evenly off it.
     */
    const tbl = arcTable(c);
    const shown = b.people.slice(0, perBranch);
    const leaves = shown.map((member, i) => {
      // Clear of the trunk at one end, short of the label at the other.
      const u = 0.34 + (i / Math.max(shown.length - 1, 1)) * 0.58;
      const p = atLength(c, tbl, u);
      /**
       * Hung below the branch, on alternating stems.
       *
       * All at one depth they draw a row of discs under a line, which is a
       * toolbar. The two lengths also have to differ by more than a face
       * is tall — at a difference of less than that, neighbours that are
       * close along the branch still overlap, which is what the shorter
       * top branches were doing while the long bottom ones looked fine.
       */
      const stem = i % 2 === 0 ? h * 0.042 : h * 0.115;
      return { member, x: p.x, y: p.y + stem, ax: p.x, ay: p.y };
    });

    return {
      branch: b,
      body: ribbon(c, 17 - b.tier * 2.5, 2.6),
      spine: pathOf(c),
      tip: { x: tipX, y: tipY - h * 0.05 },
      leaves,
      hidden: b.people.length - shown.length,
    };
  });
}

export type Trunk = {
  /** The trunk itself, as one tapering shape. */
  body: string;
  /** Bright fibres running up inside it. */
  strands: string[];
  /** What it flares into at the ground. */
  roots: string[];
  /** The pool of light it stands in. */
  glowY: number;
};

/**
 * The trunk, as a filled shape rather than a pair of lines.
 *
 * Two strokes side by side look like chopsticks however well they are
 * coloured: a trunk is a solid that tapers, and the taper is the only
 * reason the branches look like they grew out of something. It stops at
 * the highest fork — carried past it, it is a spike standing alone over the
 * canopy with nothing growing off it.
 *
 * Kept as slight as it can be and still hold the canopy up. Drawn on a
 * dark pool it could afford to be a heavy gold column; drawn straight onto
 * a street map it has to behave like the rest of the map's ink, and the
 * people are what the picture is about — a thick trunk makes the tree the
 * subject and the room the decoration.
 */
export function trunkFor(branches: Branch[], w: number, h: number): Trunk {
  const cx = w / 2;
  const base = h * 0.985;
  const top = forkY(h, branches.length ? Math.max(...branches.map((b) => b.tier)) : 0);

  const spine: Cubic = [cx, base, cx - w * 0.009, h * 0.78, cx + w * 0.007, h * 0.56, cx, top];

  // Two offset copies of the spine, which is what keeps it reading as a
  // bundle of fibres lit from inside rather than one moulded cone. Four of
  // them at this width is just a thicker trunk with lines on it.
  const strands = [-0.5, 0.5].map((o) =>
    ribbon(shift(spine, o * w * 0.008), 2.6, 0.6, 26, 1.7)
  );

  /**
   * Two roots a side, not three.
   *
   * At three they fanned evenly off one point and drew a broom. Two of
   * unequal length and curvature is what a trunk meeting the ground
   * actually looks like, and the asymmetry is most of the reason the
   * picture doesn't read as clip art.
   */
  const roots = [-1, 1].flatMap((side) =>
    [
      // Short enough to stay under the canopy. Reaching a fifth of the
      // canvas each way they stopped reading as roots and started reading
      // as legs, sprawling out across streets the tree is nowhere near.
      { out: 0.145, drop: 0.055, wide: 7 },
      { out: 0.085, drop: 0.028, wide: 4.5 },
    ].map((r) =>
      ribbon(
        [
          cx + side * 4,
          h * 0.84,
          cx + side * w * 0.016,
          h * 0.93,
          cx + side * w * r.out * 0.45,
          base - h * r.drop * 0.12,
          cx + side * w * r.out,
          base + h * 0.002,
        ],
        r.wide,
        0.9
      )
    )
  );

  return { body: ribbon(spine, w * 0.032, w * 0.009, 34, 1.7), strands, roots, glowY: base };
}

/* ───────────────────────────────────────────────────── curves, as shapes */

function at(c: Cubic, t: number) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
  return { x: a * c[0] + b * c[2] + d * c[4] + e * c[6], y: a * c[1] + b * c[3] + d * c[5] + e * c[7] };
}

type Arc = { ts: number[]; ls: number[]; total: number };

/** Distance travelled along the curve at each of 48 even steps of `t`. */
function arcTable(c: Cubic, n = 48): Arc {
  const ts = [0];
  const ls = [0];
  let prev = at(c, 0);
  let total = 0;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = at(c, t);
    total += Math.hypot(p.x - prev.x, p.y - prev.y);
    ts.push(t);
    ls.push(total);
    prev = p;
  }
  return { ts, ls, total };
}

/** The point `u` of the way along the curve *by distance*. */
function atLength(c: Cubic, tbl: Arc, u: number) {
  const want = u * tbl.total;
  let i = 1;
  while (i < tbl.ls.length - 1 && tbl.ls[i] < want) i++;
  const span = tbl.ls[i] - tbl.ls[i - 1];
  const f = span === 0 ? 0 : (want - tbl.ls[i - 1]) / span;
  return at(c, tbl.ts[i - 1] + (tbl.ts[i] - tbl.ts[i - 1]) * f);
}

/** The tangent, for the normal a tapering outline has to be offset along. */
function dir(c: Cubic, t: number) {
  const u = 1 - t;
  const a = 3 * u * u, b = 6 * u * t, d = 3 * t * t;
  const x = a * (c[2] - c[0]) + b * (c[4] - c[2]) + d * (c[6] - c[4]);
  const y = a * (c[3] - c[1]) + b * (c[5] - c[3]) + d * (c[7] - c[5]);
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function shift(c: Cubic, dx: number): Cubic {
  return [c[0] + dx, c[1], c[2] + dx, c[3], c[4] + dx, c[5], c[6] + dx, c[7]];
}

function pathOf(c: Cubic) {
  return `M ${r(c[0])} ${r(c[1])} C ${r(c[2])} ${r(c[3])}, ${r(c[4])} ${r(c[5])}, ${r(c[6])} ${r(c[7])}`;
}

/**
 * A curve with width, as a closed outline.
 *
 * SVG cannot vary a stroke's width along its length, and a branch of
 * constant width is a wire. So the curve is walked, offset along its own
 * normal by a width that falls from `w0` to `w1`, and closed — one filled
 * path per branch, no filters, no per-segment elements.
 *
 * The taper is eased rather than linear, and the two kinds of limb ease
 * opposite ways. A branch loses most of its thickness in the first third
 * and then holds — `ease` below 1. A trunk holds its girth most of the way
 * up and narrows near the crown — `ease` above 1. At the branch's setting
 * the trunk came out as a flat bar standing on a flare, which is what sent
 * the first drawing back.
 */
function ribbon(c: Cubic, w0: number, w1: number, samples = 26, ease = 0.62): string {
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = at(c, t);
    const d = dir(c, t);
    const half = (w0 + (w1 - w0) * Math.pow(t, ease)) / 2;
    left.push(`${r(p.x - d.y * half)} ${r(p.y + d.x * half)}`);
    right.push(`${r(p.x + d.y * half)} ${r(p.y - d.x * half)}`);
  }
  return `M ${left[0]} L ${left.slice(1).join(" L ")} L ${right.reverse().join(" L ")} Z`;
}

function r(n: number) {
  return Math.round(n * 10) / 10;
}
