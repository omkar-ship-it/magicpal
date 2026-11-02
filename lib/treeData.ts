import type { CircleMember } from "./circleData";

/**
 * A crowded room, drawn as a tree — all of it.
 *
 * The directory answers a dense place correctly and looks like a database
 * while it does it. Nobody screenshots a filtered list, and for a
 * co-working space the thing that has to travel — to the next operator, to
 * a member's group chat — is a picture of the room that somebody wants to
 * send.
 *
 * Every person in the room is a leaf. Not a sample with the rest behind a
 * count: four hundred and twenty people make four hundred and twenty
 * leaves, and the size of the crown is the size of the room. That is the
 * whole claim the picture makes, and sampling it would have made the claim
 * false while looking identical.
 *
 * What changes with how big the thing is drawn is not *how many* people
 * are on it but *how much of each one you can see*. Far out they are
 * coloured foliage; as it grows, the leaves nearest you resolve into
 * faces; drawn large enough, every one is a face. See `faceBudget`.
 *
 * It is not a replacement for the list. A tree is the answer to "what is
 * this room", a list is the answer to "find me a backend engineer", and
 * pretending either does both is how the first four attempts went wrong.
 *
 * Everything below is geometry only, in abstract canvas units, so the same
 * numbers drive the tree growing out of a building on the map and the tree
 * on its own page. Two layouts would have drifted within a week.
 */

/** The canvas everything is laid out against. Square: a full crown is. */
export const W = 1000;
export const H = 1000;

export type Discipline = {
  id: string;
  label: string;
  /** Drawn in this hue, and the branch glows with it. */
  hue: string;
  icon: string;
};

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
  /** Which half of the crown, for label alignment. */
  side: -1 | 1;
  /** 0 is the outermost, lowest bough on its side. */
  depth: number;
};

/**
 * Branches, biggest lowest, and the two sides kept level.
 *
 * A real tree is heaviest where it is oldest and the eye reads bottom-up on
 * something trunk-shaped, so the discipline with the most people takes the
 * lowest, outermost bough. Sides are filled by giving each new branch to
 * whichever side is currently carrying fewer people — alternating strictly
 * put 252 of 420 on the left and left the tree leaning.
 *
 * `rank` optionally orders the people within a branch — on the map it is
 * relevance to the reader, which is what decides whose face resolves first
 * as the tree grows, and so what makes the tree *yours*.
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

  const sorted = DISCIPLINES.map((d) => ({
    discipline: d,
    people: rank ? [...(byId.get(d.id) ?? [])].sort(rank) : (byId.get(d.id) ?? []),
  }))
    .filter((b) => b.people.length > 0)
    .sort((a, b) => b.people.length - a.people.length);

  const load = { "-1": 0, "1": 0 } as Record<string, number>;
  const depth = { "-1": 0, "1": 0 } as Record<string, number>;
  return sorted.map((b) => {
    const side: -1 | 1 = load["-1"] <= load["1"] ? -1 : 1;
    load[side] += b.people.length;
    return { ...b, side, depth: depth[side]++ };
  });
}

/** One person, and where in the crown they are. */
export type Leaf = {
  member: CircleMember;
  x: number;
  y: number;
  /** Degrees to turn the leaf by, so foliage lies along the bough it grew on. */
  tilt: number;
  /**
   * 0 is the first face to resolve as the tree grows.
   *
   * Ranks are scattered across the whole wedge rather than filling it from
   * one end, so the faces that appear first are spread through the foliage
   * instead of huddled on one twig.
   */
  rank: number;
};

export type Drawn = {
  branch: Branch;
  /** The bough, as a tapering filled shape from the trunk into the crown. */
  limb: string;
  /** Thin forks spreading through the foliage, so it has something to grow on. */
  twigs: string[];
  /** Where the label sits, just outside the canopy. */
  tip: { x: number; y: number };
  leaves: Leaf[];
};

export type Canopy = {
  drawn: Drawn[];
  /**
   * Distance between neighbouring leaves, in canvas units.
   *
   * Set once for the whole tree from how many people are in it, and the
   * single number that decides when a leaf has room to be a face.
   */
  spacing: number;
};

/* ─────────────────────────────────────────────────────── the crown's shape */

/** Centre of the crown, and the ring of trunk it is hollow around. */
const CC = { x: W / 2, y: H * 0.455 };
const R_IN = H * 0.085;
const R_OUT = H * 0.405;
/**
 * Half the arc the canopy wraps through, measured from straight up.
 *
 * Not a full circle: a tree is open at the bottom, which is where the
 * trunk comes through. And not quite closed at the top either — the small
 * keep-out is partly a notch real crowns have, and mostly somewhere for
 * the two innermost labels to sit, which at a sealed crown were stacked
 * off the top of the canvas.
 */
const ARC = (118 * Math.PI) / 180;
const TOP_GAP = (10 * Math.PI) / 180;

/** How far a leaf may wander from its slot, as a fraction of the spacing. */
const JITTER = 0.2;

const BASE_Y = H * 0.985;
const TRUNK_TOP = H * 0.6;

/**
 * The whole canopy: every person placed, nothing sampled.
 *
 * Each branch gets a wedge of the crown with an angle proportional to how
 * many people it holds, so the picture's proportions *are* the room's —
 * and because leaf density is then the same everywhere, one spacing covers
 * the tree and faces appear everywhere at once rather than branch by
 * branch.
 */
export function layout(branches: Branch[]): Canopy {
  const total = branches.reduce((n, b) => n + b.people.length, 0) || 1;

  /**
   * Leaf spacing, from the room's population and the crown's area.
   *
   * The crown does not grow; the leaves get finer. A tree whose canvas
   * grew with its headcount would be the same picture at every size, and
   * the thing worth seeing is that four hundred people make a denser
   * canopy than forty.
   */
  const area = (ARC - TOP_GAP) * (R_OUT * R_OUT - R_IN * R_IN);
  const spacing = clamp(Math.sqrt(area / (total * 1.3)), 13, 64);

  // Each side's wedges run from the outside in, biggest first.
  const bySide = {
    [-1]: branches.filter((b) => b.side === -1).sort((a, b) => a.depth - b.depth),
    [1]: branches.filter((b) => b.side === 1).sort((a, b) => a.depth - b.depth),
  };
  const span = new Map<Branch, [number, number]>();
  /**
   * A wedge's share of the sky, from the cube-ish root of its headcount.
   *
   * Straight proportion is the honest encoding and it drew a twenty-two
   * person discipline as a twelve-degree splinter with its label lying
   * across somebody else's foliage. The compression keeps the big
   * branches visibly bigger and gives the small ones room to be read.
   * Leaf *spacing* is global either way, so a roomier wedge simply reads
   * as airier foliage rather than as a wrong count.
   */
  for (const sign of [-1, 1] as const) {
    const group = bySide[sign];
    const weights = group.map((b) => Math.pow(b.people.length, 0.78));
    const held = weights.reduce((n, x) => n + x, 0) || 1;
    // Each half of the arc is divided among its own branches, so neither
    // side is left with a bald patch when the two carry different loads.
    const usable = ARC - TOP_GAP;
    let edge = sign * ARC;
    group.forEach((b, i) => {
      const width = (weights[i] / held) * usable * -sign;
      span.set(b, [edge, edge + width]);
      edge += width;
    });
  }

  const drawn = branches.map((b) => {
      const [a0, a1] = span.get(b)!;
      const mid = (a0 + a1) / 2;
      const sgn = b.side;

      // Outer boughs leave the trunk lowest, which is the one property
      // that keeps a radial crown reading as a tree and not a sunburst.
      const forkY = TRUNK_TOP + H * (0.155 - b.depth * 0.05);
      const reach = R_IN + (R_OUT - R_IN) * 0.48;
      const end = polar(mid, reach);

      const limbC: Cubic = [
        CC.x + sgn * 9,
        forkY,
        CC.x + sgn * W * 0.1,
        forkY - H * 0.05,
        end.x - sgn * Math.abs(end.x - CC.x) * 0.3,
        end.y + (forkY - end.y) * 0.22,
        end.x,
        end.y,
      ];

      // Three forks fanning across the wedge, so the foliage has something
      // under it rather than floating in a cloud.
      const twigs = [-0.32, 0, 0.32].map((f) => {
        const at = mid + (a1 - a0) * f * 0.5;
        const tip = polar(at, R_OUT * 0.9);
        const from = onCubic(limbC, 0.72);
        return ribbon(
          [from.x, from.y, end.x, end.y, (end.x + tip.x) / 2, (end.y + tip.y) / 2, tip.x, tip.y],
          5.5,
          1.1,
          18
        );
      });

      const label = polar(mid, R_OUT + H * 0.038);

      return {
        branch: b,
        // A bough's thickness is its share of the room. Six identical
        // limbs made the headcount something you could only read off a
        // label; this way the drawing itself carries it.
        limb: ribbon(limbC, 9 + 32 * Math.sqrt(b.people.length / total), 4.5, 30),
        twigs,
        tip: { x: clamp(label.x, 96, W - 96), y: clamp(label.y, 30, H - 30) },
        leaves: placeLeaves(b, a0, a1, spacing),
      };
  });

  return { spacing, drawn: spreadLabels(drawn) };
}

/**
 * Nudge labels apart where they would sit on top of one another.
 *
 * Each label wants to be at its wedge's mid-angle, just outside the
 * canopy. That is right for the wide wedges and hopeless for the narrow
 * ones at the crown, whose mid-angles are a few degrees apart — the three
 * smallest disciplines landed in a heap on the skyline. One pass down the
 * list by height, pushing any pair that is close in both axes apart
 * vertically, is enough and keeps every label next to its own foliage.
 */
function spreadLabels(drawn: Drawn[]): Drawn[] {
  const minY = H * 0.052;
  const sameColumn = W * 0.21;
  const order = [...drawn].sort((a, b) => a.tip.y - b.tip.y);
  for (let i = 1; i < order.length; i++) {
    for (let j = 0; j < i; j++) {
      const above = order[j].tip;
      const here = order[i].tip;
      if (Math.abs(here.x - above.x) < sameColumn && here.y - above.y < minY) {
        here.y = above.y + minY;
      }
    }
  }
  for (const d of drawn) d.tip.y = clamp(d.tip.y, 30, H - 30);
  return drawn;
}

/**
 * Every person in a wedge, on a jittered polar grid.
 *
 * Rings outward from the trunk, each holding as many leaves as its own arc
 * length allows, so the spacing stays even as the wedge widens — the
 * ordinary mistake here is an even *angular* step, which packs the inner
 * rings and leaves the rim bare.
 */
function placeLeaves(b: Branch, a0: number, a1: number, spacing: number): Leaf[] {
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  const slots: Array<{ x: number; y: number; tilt: number }> = [];

  for (let r = R_IN + spacing * 0.6; r < R_OUT; r += spacing * 0.9) {
    const arc = (hi - lo) * r;
    const per = Math.max(1, Math.floor(arc / spacing));
    for (let i = 0; i < per; i++) {
      const t = per === 1 ? 0.5 : (i + 0.5) / per;
      const a = lo + (hi - lo) * t;
      // Jitter, or the crown reads as a dartboard. Hashed off the ring and
      // the slot so a refresh never reshuffles the tree.
      // Kept small on purpose. Two neighbours each shoved a third of a
      // gap toward one another close it by two thirds, and at the zoom
      // where every leaf is a face that reads as two faces colliding —
      // the pile-up this picture exists to answer, inside the answer.
      const jr = ((rnd(`r${b.discipline.id}${r | 0}${i}`) % 100) / 100 - 0.5) * spacing * JITTER;
      const ja = ((rnd(`a${b.discipline.id}${r | 0}${i}`) % 100) / 100 - 0.5) * (spacing * JITTER) / r;
      const p = polar(a + ja, r + jr);
      /**
       * Leaves lie along the direction they grew out in, give or take.
       *
       * Drawn as circles the canopy is a dot plot with a tree underneath
       * it; drawn as small ellipses turned to follow the bough it is
       * foliage. It costs one number per person and it is the difference
       * between a chart and a picture somebody sends to a friend.
       */
      const tilt =
        (a * 180) / Math.PI + 90 + ((rnd(`t${b.discipline.id}${r | 0}${i}`) % 60) - 30);
      slots.push({ ...p, tilt });
    }
  }

  if (slots.length === 0) return [];

  /**
   * Rank r goes to slot (r · stride) mod n.
   *
   * Filling the slots in order would put the first faces to resolve in a
   * huddle on the innermost ring. A coprime stride walks the whole wedge,
   * so whatever fraction of the branch is showing faces is spread evenly
   * through its foliage.
   */
  const n = slots.length;
  const stride = coprimeNear(n, Math.round(n * 0.618));
  return b.people.slice(0, n).map((member, rank) => {
    const s = slots[(rank * stride) % n];
    return { member, x: s.x, y: s.y, tilt: s.tilt, rank };
  });
}

/**
 * How many of a branch's leaves have room to be faces at this drawn size.
 *
 * A face is a fixed number of screen pixels wherever it is; the canvas is
 * not. So the question is how many canvas units a face takes up at the
 * size the tree is currently drawn, and how many leaves can be that far
 * apart inside a wedge that holds `n` of them `spacing` apart.
 *
 * Showing `m` of `n` evenly scattered leaves leaves them about
 * `spacing · √(n/m)` apart. Jitter takes a fixed bite out of that — two
 * neighbours each wandering toward the other — so the room a face needs is
 * `needed + 2·JITTER·spacing`, and
 *
 *     m ≤ n · (spacing / (needed + 2·JITTER·spacing))²
 *
 * which is why the tree resolves smoothly as it grows rather than flipping
 * between two states. Charging the jitter as a *factor* instead was the
 * near miss: it is negligible when six faces are scattered through a
 * hundred leaves and decisive when all hundred are faces, and a factor
 * gets both ends wrong at once.
 */
export function faceBudget(n: number, spacing: number, drawnWidth: number, facePx: number): number {
  if (drawnWidth <= 0) return 0;
  const needed = (facePx * 1.1 * W) / drawnWidth + 2 * JITTER * spacing;
  return clamp(Math.floor(n * Math.pow(spacing / needed, 2)), 0, n);
}

export type Trunk = {
  body: string;
  strands: string[];
  roots: string[];
};

/**
 * The trunk, as a filled shape rather than a pair of lines.
 *
 * Two strokes side by side look like chopsticks however well they are
 * coloured: a trunk is a solid that tapers, and the taper is the only
 * reason the branches look like they grew out of something.
 *
 * Kept as slight as it can be and still hold the canopy up. Drawn on a
 * dark pool it could afford to be a heavy gold column; drawn straight onto
 * a street map it has to behave like the rest of the map's ink, and the
 * people are what the picture is about — a thick trunk makes the tree the
 * subject and the room the decoration.
 */
export function trunkFor(): Trunk {
  const cx = W / 2;
  const spine: Cubic = [cx, BASE_Y, cx - W * 0.009, H * 0.85, cx + W * 0.007, H * 0.68, cx, TRUNK_TOP];

  // Two offset copies of the spine, which is what keeps it reading as a
  // bundle of fibres lit from inside rather than one moulded cone.
  const strands = [-0.5, 0.5].map((o) => ribbon(shift(spine, o * W * 0.008), 2.6, 0.6, 26, 1.7));

  const roots = [-1, 1].flatMap((side) =>
    // Short enough to stay under the canopy. Reaching a fifth of the
    // canvas each way they stopped reading as roots and started reading
    // as legs, sprawling out across streets the tree is nowhere near.
    [
      { out: 0.145, wide: 7 },
      { out: 0.085, wide: 4.5 },
    ].map((r) =>
      ribbon(
        [
          cx + side * 4,
          H * 0.9,
          cx + side * W * 0.016,
          H * 0.955,
          cx + side * W * r.out * 0.45,
          BASE_Y - H * 0.004,
          cx + side * W * r.out,
          BASE_Y + H * 0.002,
        ],
        r.wide,
        0.9
      )
    )
  );

  return { body: ribbon(spine, W * 0.032, W * 0.011, 34, 1.7), strands, roots };
}

/* ───────────────────────────────────────────────────── curves, as shapes */

type Cubic = [number, number, number, number, number, number, number, number];

function polar(angle: number, r: number) {
  return { x: CC.x + Math.sin(angle) * r, y: CC.y - Math.cos(angle) * r };
}

function onCubic(c: Cubic, t: number) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
  return { x: a * c[0] + b * c[2] + d * c[4] + e * c[6], y: a * c[1] + b * c[3] + d * c[5] + e * c[7] };
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
    const p = onCubic(c, t);
    const d = dir(c, t);
    const half = (w0 + (w1 - w0) * Math.pow(t, ease)) / 2;
    left.push(`${r1(p.x - d.y * half)} ${r1(p.y + d.x * half)}`);
    right.push(`${r1(p.x + d.y * half)} ${r1(p.y - d.x * half)}`);
  }
  return `M ${left[0]} L ${left.slice(1).join(" L ")} L ${right.reverse().join(" L ")} Z`;
}

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** The nearest number to `near` that shares no factor with `n`. */
function coprimeNear(n: number, near: number) {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  for (let d = 0; d < n; d++) {
    for (const k of [near + d, near - d]) {
      if (k > 0 && k < n && gcd(n, k) === 1) return k;
    }
  }
  return 1;
}

/** Stable hash, so the same room draws the same tree on every screen. */
function rnd(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
