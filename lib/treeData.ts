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
export const DISCIPLINES: Discipline[] = [
  { id: "eng", label: "Engineering", hue: "#8b7bf7", icon: "</>" },
  { id: "product", label: "Product", hue: "#f5a524", icon: "◆" },
  { id: "design", label: "Design", hue: "#5ec26a", icon: "✎" },
  { id: "data", label: "AI & Data", hue: "#3da5f5", icon: "✦" },
  { id: "growth", label: "Marketing", hue: "#f2618f", icon: "◈" },
  { id: "business", label: "Business", hue: "#2fc3bd", icon: "▤" },
];

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
 */
export function branchesFor(people: CircleMember[]): Branch[] {
  const byId = new Map<string, CircleMember[]>();
  for (const m of people) {
    const id = disciplineOf(m);
    const list = byId.get(id) ?? [];
    list.push(m);
    byId.set(id, list);
  }

  return DISCIPLINES.map((d) => ({ discipline: d, people: byId.get(d.id) ?? [] }))
    .filter((b) => b.people.length > 0)
    .sort((a, b) => b.people.length - a.people.length)
    .map((b, i) => ({
      ...b,
      side: (i % 2 === 0 ? -1 : 1) as -1 | 1,
      tier: Math.floor(i / 2),
    }));
}

/** Faces drawn on a branch before the rest become a count. */
export const LEAVES = 6;

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
  /** The branch itself, as a cubic through the canvas. */
  path: string;
  /** Where the label sits, at the outer end. */
  tip: { x: number; y: number };
  leaves: Leaf[];
  hidden: number;
};

/**
 * The geometry, in one place and in canvas units.
 *
 * Laid out against a fixed viewBox and scaled by the SVG rather than
 * measured from the DOM: the picture has to be identical in a screenshot,
 * on a phone, and in whatever somebody pastes it into.
 */
export function layout(branches: Branch[], w: number, h: number): Drawn[] {
  const cx = w / 2;
  const rootY = h * 0.99;
  const tiers = Math.max(1, Math.max(...branches.map((b) => b.tier)) + 1);

  return branches.map((b) => {
    /**
     * Lowest branch is the longest, and every branch rises.
     *
     * The first draft forked them all from one point and ran them sideways,
     * which drew six power lines off two chopsticks. A branch leaves the
     * trunk at its own height and ends *above* where it started — that one
     * property is most of what makes a shape read as a tree.
     */
    const t = b.tier / tiers;
    const forkY = rootY - h * (0.30 + b.tier * 0.15);
    const reach = w * (0.34 - b.tier * 0.04);
    const tipX = cx + b.side * reach;
    const tipY = forkY - h * (0.17 - t * 0.02);

    const x0 = cx + b.side * 7;
    const y0 = forkY;
    const c1x = cx + b.side * w * 0.09;
    const c1y = forkY - h * 0.015;
    // Pulled above the tip so the curve crests before it lands, which is
    // what gives a branch its droop at the end instead of a ramp.
    const c2x = cx + b.side * reach * 0.62;
    const c2y = tipY - h * 0.05;
    const path = `M ${x0} ${y0} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tipX} ${tipY}`;

    const shown = b.people.slice(0, LEAVES);
    const leaves = shown.map((member, i) => {
      // Out of the trunk's way, and stopping short of the label.
      const u = 0.3 + (i / Math.max(shown.length - 1, 1)) * 0.6;
      const p = onCubic(u, x0, y0, c1x, c1y, c2x, c2y, tipX, tipY);
      /**
       * Shorter than half the gap between tiers, or faces collide.
       *
       * At a lift of 0.075h against a tier spacing of 0.145h, a face
       * pushed up off one branch and one pushed down off the branch above
       * landed within a few pixels of each other — and they are on the same
       * side of the trunk, so it happened on every tree.
       */
      const lift = (i % 2 === 0 ? -1 : 1) * h * 0.042;
      return { member, x: p.x, y: p.y + lift, ax: p.x, ay: p.y };
    });

    return { branch: b, path, tip: { x: tipX, y: tipY }, leaves, hidden: b.people.length - shown.length };
  });
}

/**
 * The trunk, as a filled shape rather than a pair of lines.
 *
 * Two strokes side by side look like chopsticks however well they are
 * coloured: a trunk is a solid that tapers, and the taper is the only
 * reason the branches look like they grew out of something.
 */
export function trunkPath(w: number, h: number): string {
  const cx = w / 2;
  const base = h * 0.995;
  // Stops just above the highest fork. Carried on to 0.2h it was a spike
  // standing alone over the canopy with nothing growing off it.
  const top = h * 0.33;
  return [
    `M ${cx - 30} ${base}`,
    `C ${cx - 22} ${h * 0.72}, ${cx - 13} ${h * 0.46}, ${cx - 5} ${top}`,
    `L ${cx + 5} ${top}`,
    `C ${cx + 13} ${h * 0.46}, ${cx + 22} ${h * 0.72}, ${cx + 30} ${base}`,
    "Z",
  ].join(" ");
}

/** The two roots it flares into, drawn as strokes under the trunk. */
export function rootPaths(w: number, h: number): string[] {
  const cx = w / 2;
  const base = h * 0.995;
  return [
    `M ${cx - 6} ${h * 0.78} C ${cx - 26} ${h * 0.87}, ${cx - 70} ${base - 6}, ${cx - 150} ${base}`,
    `M ${cx + 6} ${h * 0.78} C ${cx + 26} ${h * 0.87}, ${cx + 70} ${base - 6}, ${cx + 150} ${base}`,
  ];
}

function onCubic(
  t: number,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * x0 + b * x1 + c * x2 + d * x3, y: a * y0 + b * y1 + c * y2 + d * y3 };
}
