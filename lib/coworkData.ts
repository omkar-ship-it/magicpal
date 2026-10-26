import { rnd } from "./circleData";

/**
 * One co-working floor, densely populated.
 *
 * Built for a pitch, so the thing it has to get right is *density*. A
 * co-working operator's whole product is that a few hundred people share a
 * room; every demo of "community software" they have ever been shown runs
 * on twelve fake users, and twelve people is a dinner party, not a floor.
 * At two hundred the questions change — you stop asking "who is here" and
 * start asking "who here is worth getting up for", which is the only
 * question this product answers.
 *
 * Everything is deterministic from a seed, so the pitch looks identical on
 * every machine it is opened on.
 */

export const SPACE = {
  operator: "WeWork",
  name: "WeWork Galaxy",
  address: "Residency Road, Bengaluru",
  /** Members on the books, of whom only some are in on any given day. */
  memberCount: 214,
  floors: "4 floors · 1,100 desks",
};

const GIVEN = [
  "Aarav", "Diya", "Rohan", "Ananya", "Vikram", "Meera", "Karthik", "Shreya", "Imran", "Nandini",
  "Siddharth", "Kavya", "Arjun", "Priya", "Rahul", "Sneha", "Aditya", "Divya", "Nikhil", "Tara",
  "Varun", "Isha", "Manish", "Lakshmi", "Dhruv", "Pooja", "Sanjay", "Ritu", "Harish", "Anjali",
];
const FAMILY = [
  "Sharma", "Iyer", "Nair", "Reddy", "Banerjee", "Qureshi", "Desai", "Pillai", "Menon", "Chandran",
  "Bose", "Raman", "Kulkarni", "Shetty", "Rao", "Gupta", "Verma", "Joshi", "Khan", "Mehta",
];

export type CompanyKind = "startup" | "agency" | "gcc" | "solo" | "investor";

type Company = { name: string; kind: CompanyKind; what: string };

/**
 * Invented companies, deliberately.
 *
 * Naming real businesses as tenants of a real building would be making up
 * facts about both of them. The mix is what's realistic: a long tail of
 * small startups, a couple of agencies, one offshore engineering team, a
 * seed fund, and a lot of people who are their own company.
 */
const COMPANIES: Company[] = [
  { name: "Clearwing", kind: "startup", what: "payments infrastructure" },
  { name: "Tessel", kind: "startup", what: "warehouse robotics" },
  { name: "Mirrorlake", kind: "startup", what: "B2B analytics" },
  { name: "Kettu Labs", kind: "startup", what: "developer tooling" },
  { name: "Saffron Pay", kind: "startup", what: "merchant lending" },
  { name: "Verdant", kind: "startup", what: "climate reporting" },
  { name: "Northbeam", kind: "startup", what: "logistics software" },
  { name: "Halcyon Health", kind: "startup", what: "clinic software" },
  { name: "Pennywise", kind: "startup", what: "SMB accounting" },
  { name: "Lotus Learning", kind: "startup", what: "upskilling" },
  { name: "Daybreak", kind: "startup", what: "consumer fintech" },
  { name: "Quillpad", kind: "startup", what: "legal AI" },
  { name: "Foundry Six", kind: "agency", what: "brand and product design" },
  { name: "Ninefold", kind: "agency", what: "growth and performance" },
  { name: "Atlas Content", kind: "agency", what: "B2B content" },
  { name: "Meridian GCC", kind: "gcc", what: "platform engineering" },
  { name: "Stride Offshore", kind: "gcc", what: "data engineering" },
  { name: "Rangoli Capital", kind: "investor", what: "seed stage" },
  { name: "Independent", kind: "solo", what: "freelance" },
];

export type Zone =
  | "Main floor"
  | "Quiet zone"
  | "Lounge"
  | "Phone booths"
  | "Café"
  | "Meeting room"
  | "Terrace";

const ZONES: Zone[] = ["Main floor", "Main floor", "Main floor", "Quiet zone", "Lounge", "Lounge", "Phone booths", "Café", "Meeting room", "Terrace"];

/**
 * The floor, as geometry.
 *
 * This is the map. At the scale of one building a street map is a grey
 * rectangle, and pretending to place people at metre precision inside it
 * would be inventing indoor positioning that does not exist — so the
 * canvas is the plan, and the unit of position is the zone, which is
 * something a person can actually declare about themselves.
 *
 * Percentages rather than pixels: the plan has to hold its proportions
 * from a phone to a pitch screen.
 */
export type ZoneBox = {
  id: Zone;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Desks, sofas, booths — what the room is for, in one word. */
  note: string;
};

export const FLOOR_PLAN: ZoneBox[] = [
  { id: "Café", x: 3, y: 10, w: 22, h: 18, note: "coffee, all day" },
  { id: "Lounge", x: 27, y: 10, w: 28, h: 18, note: "sofas, loud talk" },
  { id: "Terrace", x: 57, y: 10, w: 40, h: 18, note: "outdoors" },
  { id: "Main floor", x: 3, y: 32, w: 52, h: 40, note: "hot desks" },
  { id: "Quiet zone", x: 57, y: 32, w: 40, h: 17, note: "no calls" },
  { id: "Phone booths", x: 57, y: 53, w: 18, h: 19, note: "calls only" },
  { id: "Meeting room", x: 79, y: 53, w: 18, h: 19, note: "bookable" },
];

/**
 * Where the lifts open. The one fixed point everybody orients from — and
 * placed bottom-centre rather than in a corner, because the panels float
 * over the bottom-left and the "you are here" marker is the last thing on
 * this screen that should be hidden behind one.
 */
export const ENTRANCE = { x: 30, y: 77, w: 25, h: 16, label: "Reception & lifts" };

/**
 * How many faces a room shows before the rest become a "+N".
 *
 * Scaled by floor area, because a fixed cap made the big room look empty:
 * seven faces spread across the hot-desk floor read as a quiet afternoon
 * when twenty-five people were actually sitting in it, which is the
 * opposite of what the plan is for.
 */
export function facesShown(box: ZoneBox): number {
  return Math.max(4, Math.min(18, Math.round((box.w * box.h) / 125)));
}

export const zoneBox = (z: Zone): ZoneBox | undefined => FLOOR_PLAN.find((b) => b.id === z);

/**
 * A deterministic spot inside a zone, on a loose grid so faces never land
 * exactly on top of each other. Seeded by the person, so somebody is in
 * the same seat every time the page is opened — a plan where everyone
 * teleports between refreshes reads as decoration rather than data.
 */
export function seatIn(box: ZoneBox, index: number, of: number): { x: number; y: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(of * (box.w / box.h))));
  const rows = Math.max(1, Math.ceil(of / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);

  /**
   * Margins in plan units, not fractions of the room.
   *
   * A fraction looked right until the rooms had different shapes: the same
   * 34% that cleared the label in the hot-desk floor put the café's top row
   * straight through its own heading, and its bottom row under the "+4
   * more" chip. The label and the chip are a fixed size whatever the room
   * is, so the space reserved for them has to be fixed too.
   */
  // TOP has to clear the label *and* half an avatar: the mark is drawn
  // centred on its seat, so a band only as tall as the heading still put
  // the top row's chins through it.
  const TOP = 7.8;
  const BOTTOM = 4.4;
  const padX = Math.max(box.w * 0.12, 3);
  const usableW = Math.max(box.w - padX * 2, 0);
  const usableH = Math.max(box.h - TOP - BOTTOM, 0);
  return {
    x: box.x + padX + (cols === 1 ? usableW / 2 : (usableW * col) / (cols - 1 || 1)),
    y: box.y + TOP + (rows === 1 ? usableH / 2 : (usableH * row) / (rows - 1 || 1)),
  };
}

export type Discipline = "Engineering" | "Product" | "Design" | "Growth" | "Founder" | "Finance" | "People" | "Sales";

const ROLES: Record<Discipline, string[]> = {
  Engineering: ["Backend engineer", "Staff engineer", "Platform lead", "Android engineer", "ML engineer", "SRE", "Full-stack engineer"],
  Product: ["Product manager", "Group PM", "Product analyst", "Head of product"],
  Design: ["Product designer", "Design lead", "Brand designer", "UX researcher"],
  Growth: ["Growth lead", "Performance marketer", "Content lead", "Community manager"],
  Founder: ["Co-founder", "Founder & CEO", "Founder & CTO"],
  Finance: ["Finance lead", "Controller", "FP&A analyst"],
  People: ["Talent partner", "Head of people", "Recruiter"],
  Sales: ["Account executive", "Sales lead", "Partnerships"],
};

const DISCIPLINES = Object.keys(ROLES) as Discipline[];

/**
 * Somebody whose company is "Independent" is not a Controller, they are a
 * consultant. Job titles belong to companies, and a pitch audience spots
 * the mismatch before they read anything else on the screen.
 */
const SOLO_ROLES: Record<Discipline, string> = {
  Engineering: "Freelance engineer",
  Product: "Product consultant",
  Design: "Freelance designer",
  Growth: "Growth consultant",
  Founder: "Solo founder",
  Finance: "Fractional CFO",
  People: "Recruiter, independent",
  Sales: "Sales consultant",
};

/** What somebody will answer if you walk over. Short, checkable, specific. */
const OFFERS = [
  "SOC 2 and security questionnaires",
  "hiring senior engineers in Bengaluru",
  "pricing and packaging",
  "raising a seed round",
  "getting an app past App Store review",
  "moving off Firebase",
  "running a design system",
  "B2B content that actually ranks",
  "GST and India entity setup",
  "performance marketing on a small budget",
  "selling into enterprises",
  "ESOP structuring",
  "scaling Postgres",
  "setting up a GCC",
  "founder-led sales",
  "building a community",
  "user research on a budget",
  "Series A metrics",
];

/** The live ask. What they'd put in the WhatsApp group and nobody answers. */
const ASKS = [
  "Anyone been through a SOC 2 Type II? Auditor recommendations welcome.",
  "Looking for a contract React Native dev for 3 weeks, starting Monday.",
  "Has anyone here sold into an Indian bank? Trying to understand the cycle.",
  "Need a designer for two weeks of product work — paid, starting this month.",
  "Who has moved payroll off Razorpay recently? Worth it?",
  "Anyone with a spare seat at a table? Happy to pair on gnarly SQL.",
  "Is there a GST consultant people here actually rate?",
  "Looking for a first sales hire. Would love to talk to anyone who's hired one.",
  "Anyone doing enterprise security reviews? I'm drowning in a 200-row sheet.",
  "Trying to hire an ML engineer. Where is everyone finding them?",
  "Who here has raised a bridge round in the last year? Want to compare notes.",
  "Need someone who knows Android TV. One afternoon of your brain, I'll buy lunch.",
  "Anyone up for a 20-minute walk at 4? I think better outdoors.",
  "Looking for five people to try what we're building. Twenty minutes, I'll buy coffee.",
  "Who do people use for India + US entity accounting?",
];

const WORKING_ON = [
  "shipping a payments reconciliation flow",
  "rewriting onboarding for the third time",
  "getting our first enterprise live",
  "a pricing experiment that is going badly",
  "hiring two engineers before March",
  "migrating 400GB off a very tired MySQL",
  "a design system nobody asked for but everybody needed",
  "our Series A deck",
  "reducing CAC by half, apparently",
  "a GCC build-out for a US client",
  "closing the books for Q3",
  "a brand refresh",
  "customer interviews, thirty of them",
  "an integration with Tally that will not die",
];

export type Worker = {
  id: string;
  name: string;
  role: string;
  discipline: Discipline;
  company: Company;
  /** In the building today. The number that makes the floor feel alive. */
  inToday: boolean;
  /** Minutes since they tapped in. Only meaningful when `inToday`. */
  arrivedMinsAgo: number;
  zone: Zone;
  /** Two things they'll answer. The reciprocity half that makes it a network. */
  offers: string[];
  /** Posted to the floor today. Most people have none at any moment. */
  ask: string | null;
  workingOn: string;
  /** Months on the books here — the operator's retention number, per face. */
  memberMonths: number;
};

function build(): Worker[] {
  const out: Worker[] = [];
  for (let i = 0; i < 214; i++) {
    const company = COMPANIES[rnd(`co-${i}`) % COMPANIES.length];
    const discipline = DISCIPLINES[rnd(`disc-${i}`) % DISCIPLINES.length];
    const roles = ROLES[discipline];
    // Roughly 45% of the membership is in on a given weekday, which is what
    // operators actually report. A floor where everybody shows up every day
    // is a floor nobody has ever worked on.
    const inToday = rnd(`in-${i}`) % 100 < 45;
    out.push({
      id: `w${i}`,
      name: `${GIVEN[rnd(`g-${i}`) % GIVEN.length]} ${FAMILY[rnd(`f-${i}`) % FAMILY.length]}`,
      role: company.kind === "solo" ? SOLO_ROLES[discipline] : roles[rnd(`role-${i}`) % roles.length],
      discipline,
      company,
      inToday,
      arrivedMinsAgo: rnd(`arr-${i}`) % 300,
      zone: ZONES[rnd(`zone-${i}`) % ZONES.length],
      offers: [
        OFFERS[rnd(`off1-${i}`) % OFFERS.length],
        OFFERS[rnd(`off2-${i}`) % OFFERS.length],
      ].filter((v, idx, arr) => arr.indexOf(v) === idx),
      // Only about one in seven of the people in today is actually asking
      // for something. An ask board where everyone is asking is a forum.
      // Assigned below, so no two people post the same sentence.
      ask: null,
      workingOn: WORKING_ON[rnd(`wo-${i}`) % WORKING_ON.length],
      memberMonths: 1 + (rnd(`mm-${i}`) % 34),
    });
  }
  /**
   * Asks are handed out in order rather than drawn at random.
   *
   * Random selection from a pool this size put the same sentence on the
   * board twice, and a board with two identical questions on it reads as
   * broken demo data — which is the one thing a pitch screen can't afford.
   * Roughly one in seven of the people in today is asking: a board where
   * everybody is asking is a forum, not a floor.
   */
  const askers = out.filter((w) => w.inToday && rnd(`ask-${w.id}`) % 7 === 0);
  askers.forEach((w, k) => {
    if (k < ASKS.length) w.ask = ASKS[k];
  });

  return out;
}

export const WORKERS: Worker[] = build();
export const IN_TODAY: Worker[] = WORKERS.filter((w) => w.inToday);
export const ASKS_TODAY: Worker[] = IN_TODAY.filter((w) => w.ask).sort(
  (a, b) => a.arrivedMinsAgo - b.arrivedMinsAgo
);

/** Companies with more than one person in today — the teams on the floor. */
export function teamsInToday(): Array<{ company: Company; people: Worker[] }> {
  const map = new Map<string, Worker[]>();
  for (const w of IN_TODAY) {
    if (w.company.kind === "solo") continue;
    const list = map.get(w.company.name);
    if (list) list.push(w);
    else map.set(w.company.name, [w]);
  }
  return [...map.values()]
    .filter((people) => people.length > 1)
    .map((people) => ({ company: people[0].company, people }))
    .sort((a, b) => b.people.length - a.people.length);
}

export type SpaceEvent = {
  id: string;
  name: string;
  time: string;
  where: string;
  host: string;
  going: number;
  kind: "talk" | "social" | "workshop";
};

export const EVENTS_TODAY: SpaceEvent[] = [
  { id: "e1", name: "Lunch & Learn: pricing for B2B", time: "1:00 pm", where: "Terrace", host: "Rangoli Capital", going: 34, kind: "talk" },
  { id: "e2", name: "Founders' coffee", time: "4:30 pm", where: "Café", host: "WeWork Galaxy", going: 18, kind: "social" },
  { id: "e3", name: "Open desk: design critique", time: "5:30 pm", where: "Meeting room 2", host: "Foundry Six", going: 11, kind: "workshop" },
];

export function arrivedLabel(mins: number): string {
  if (mins < 20) return "just arrived";
  if (mins < 60) return `in for ${mins} min`;
  return `in since ${Math.floor(mins / 60)}h ago`;
}

/* ------------------------------------------------------------- you */

export type Visitor = {
  name: string;
  role: string;
  company: string;
  /** What you'd answer if somebody walked over. */
  offers: string[];
  /** What you're here for today. Drives everything you're shown. */
  needs: string[];
};

export const VISITOR: Visitor = {
  name: "You",
  role: "Co-founder",
  company: "Northbeam",
  offers: ["scaling Postgres", "founder-led sales"],
  needs: ["SOC 2 and security questionnaires", "hiring senior engineers in Bengaluru"],
};

export type Reason = { worker: Worker; why: string; kind: "answers" | "asked" | "peer" };

/**
 * Who is worth getting up for, and why — in a sentence you can check
 * against the person's own profile before you walk over.
 *
 * Three shapes, strongest first. Somebody who can answer what you came in
 * with beats somebody you can answer, which beats somebody simply doing
 * the same job as you. No score is produced, deliberately: a number invites
 * an argument about strangers and a sentence invites a conversation.
 */
export function worthMeeting(me: Visitor, pool: Worker[], limit = 6): Reason[] {
  const out: Reason[] = [];

  for (const w of pool) {
    const answers = w.offers.find((o) => me.needs.includes(o));
    if (answers) {
      out.push({
        worker: w,
        why: `You came in asking about ${answers}. ${w.name.split(" ")[0]} does that at ${w.company.name}.`,
        kind: "answers",
      });
      continue;
    }
    if (w.ask && me.offers.some((o) => w.ask!.toLowerCase().includes(o.split(" ")[0].toLowerCase()))) {
      out.push({ worker: w, why: `${w.name.split(" ")[0]} asked the floor about this today — it's one of yours.`, kind: "asked" });
      continue;
    }
    if (w.discipline === "Founder" && w.company.kind === "startup") {
      out.push({ worker: w, why: `Also a founder, ${w.memberMonths} months on this floor. Working on ${w.workingOn}.`, kind: "peer" });
    }
  }

  /**
   * One per company, and one per need.
   *
   * Without this the top of the page was two people from the same team
   * answering the same question, which reads as the matcher having found
   * one thing and padded. Variety is not a nicety here: three cards is the
   * whole pitch, and three cards saying the same sentence is one card.
   */
  const rank = { answers: 0, asked: 1, peer: 2 } as const;
  const seenCompany = new Set<string>();
  const seenWhy = new Set<string>();
  const picked: Reason[] = [];
  for (const r of out.sort((a, b) => rank[a.kind] - rank[b.kind])) {
    const need = me.needs.find((n) => r.why.includes(n)) ?? r.kind;
    if (seenCompany.has(r.worker.company.name) || seenWhy.has(need)) continue;
    seenCompany.add(r.worker.company.name);
    seenWhy.add(need);
    picked.push(r);
    if (picked.length >= limit) break;
  }
  return picked;
}
