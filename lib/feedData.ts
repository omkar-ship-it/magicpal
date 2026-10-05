/**
 * Feed content — prototype data only, nothing persisted.
 *
 * A feed here behaves the way people expect one to: posts have a kind
 * (career update, job, poll, milestone, event share), an author with a
 * headline, reactions, and comment threads. The same shape powers a single
 * community's feed and the aggregated "catch up" feed across everything
 * you're in.
 */

export type PostKind = "update" | "career" | "job" | "poll" | "milestone" | "event" | "ask";

export type MockComment = {
  id: string;
  author: string;
  authorHeadline: string;
  body: string;
  minutesAgo: number;
};

export type MockPost = {
  id: string;
  /** "public", or a network / group / club id. */
  entityId: string;
  author: string;
  authorHeadline: string;
  kind: PostKind;
  body: string;
  minutesAgo: number;
  likes: number;
  comments: MockComment[];
  /** Career updates and milestones show a highlight strip. */
  highlight?: { emoji: string; title: string; subtitle: string };
  job?: { title: string; company: string; location: string };
  poll?: { question: string; options: Array<{ id: string; label: string; votes: number }> };
  /** An event share links into that event's page. */
  eventId?: string;
};

export function timeAgo(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d`;
  return `${Math.round(minutes / (60 * 24 * 7))}w`;
}

function c(id: string, author: string, authorHeadline: string, body: string, minutesAgo: number): MockComment {
  return { id, author, authorHeadline, body, minutesAgo };
}

export const MOCK_POSTS: MockPost[] = [
  // ------------------------------------------------------------- public
  {
    id: "p-pub-1",
    entityId: "public",
    author: "Sarah Chen",
    authorHeadline: "Partner at Horizon Ventures",
    kind: "ask",
    body: "In Bengaluru all next week. Keeping three slots open for founders building in B2B infra — reply here or book a time and I'll make it work.",
    minutesAgo: 180,
    likes: 64,
    comments: [
      c("c1", "Farhan Qureshi", "Founder, early-stage", "Would love 20 minutes. We're pre-seed in logistics pricing.", 150),
      c("c2", "Nisha Reddy", "VP Product at Driftwood", "Sarah's notes on pricing are worth the meeting alone.", 110),
    ],
  },
  {
    id: "p-pub-2",
    entityId: "public",
    author: "Kwame Asante",
    authorHeadline: "Founder at Fawaza Pay",
    kind: "ask",
    body: "Looking for intros to payments people in Nairobi or Lagos. Happy to trade everything we've learned about informal-market rails — the failure modes are not what you'd expect.",
    minutesAgo: 1500,
    likes: 41,
    comments: [c("c3", "Amara Njoroge", "Head of Partnerships at Flux", "Sending you three names today.", 1200)],
  },
  {
    id: "p-pub-3",
    entityId: "public",
    author: "Elin Berg",
    authorHeadline: "Founder at Nordlys Climate",
    kind: "milestone",
    body: "We closed our pre-seed. Eighteen months of lab work, two pivots, and a very patient first customer.",
    minutesAgo: 2900,
    likes: 212,
    highlight: { emoji: "🎉", title: "Raised pre-seed", subtitle: "Nordlys Climate · €1.4M" },
    comments: [
      c("c4", "Lukas Richter", "Founder at Sonnenlicht", "Huge. The carbon-capture cost curve needed this.", 2600),
      c("c5", "Noah Fortin", "Founder at Boreal Robotics", "Congratulations — hardware is hard, this is earned.", 2400),
    ],
  },
  {
    id: "p-pub-4",
    entityId: "public",
    author: "Olivia Bennett",
    authorHeadline: "Growth Lead at Canva",
    kind: "poll",
    body: "Settling an argument with my team.",
    minutesAgo: 600,
    likes: 28,
    poll: {
      question: "First growth hire at a seed-stage B2B company?",
      options: [
        { id: "a", label: "Generalist growth marketer", votes: 142 },
        { id: "b", label: "Lifecycle / CRM specialist", votes: 61 },
        { id: "c", label: "Growth engineer", votes: 203 },
        { id: "d", label: "Nobody — founders sell", votes: 188 },
      ],
    },
    comments: [c("c6", "Priyanka Malhotra", "Growth Lead at Groww Logistics", "Growth engineer, and it isn't close.", 400)],
  },

  // ---------------------------------------------------------- TiE Global
  {
    id: "p-tie-1",
    entityId: "tie-global",
    author: "TiE Global",
    authorHeadline: "Official account",
    kind: "event",
    body: "Registrations are open for the Global Summit. 3,000 founders, 40 countries, three days in Bengaluru.",
    minutesAgo: 1400,
    likes: 310,
    eventId: "evt-tie-summit",
    comments: [c("c7", "Vikram Shah", "Charter Member, TiE Bangalore", "Mentoring tables filled in four days last year. Book early.", 1100)],
  },
  {
    id: "p-tie-2",
    entityId: "tie-global",
    author: "TiE Global",
    authorHeadline: "Official account",
    kind: "update",
    body: "Nominations for the Global Charter Member council close at the end of the month. Any Charter Member in good standing can nominate.",
    minutesAgo: 8600,
    likes: 86,
    comments: [],
  },
  {
    id: "p-tie-sa-1",
    entityId: "tie-southasia",
    author: "Region Desk",
    authorHeadline: "TiE South Asia",
    kind: "milestone",
    body: "South Asia crossed 6,000 members this quarter. Hyderabad grew fastest, Kerala close behind.",
    minutesAgo: 5700,
    likes: 94,
    highlight: { emoji: "📈", title: "6,000 members", subtitle: "23 chapters across four countries" },
    comments: [],
  },

  // ------------------------------------------------------ TiE Bangalore
  {
    id: "p-tie-blr-1",
    entityId: "tie-bangalore",
    author: "Vikram Shah",
    authorHeadline: "Charter Member, TiE Bangalore",
    kind: "event",
    body: "Pitch Night is on for the 13th. Six teams, eight minutes each, then a panel that does not go easy on anyone.",
    minutesAgo: 2800,
    likes: 73,
    eventId: "evt-tie-blr-pitch",
    comments: [
      c("c8", "Rohit Agarwal", "Angel investor, ex-founder", "I'm on the panel. Bring numbers, not adjectives.", 2600),
      c("c9", "Farhan Qureshi", "Founder, early-stage", "Applied. Fingers crossed.", 2300),
    ],
  },
  {
    id: "p-tie-blr-2",
    entityId: "tie-bangalore",
    author: "Nandini Rao",
    authorHeadline: "Director of Product, Women in Product",
    kind: "ask",
    body: "Chapter mentors — we're two short for the next TiE Women cohort. Two hours a month, six months. It's the highest-leverage thing I do.",
    minutesAgo: 4300,
    likes: 58,
    comments: [c("c10", "Nisha Reddy", "VP Product at Driftwood", "Count me in for the product track.", 4000)],
  },
  {
    id: "p-tie-blr-3",
    entityId: "tie-bangalore",
    author: "Divya Menon",
    authorHeadline: "Chief of Staff at Clearline",
    kind: "job",
    body: "We're hiring, and chapter referrals genuinely jump the queue — they land on my desk directly.",
    minutesAgo: 900,
    likes: 44,
    job: { title: "Chief of Staff", company: "Clearline", location: "Hyderabad · Hybrid" },
    comments: [],
  },
  {
    id: "p-tie-blr-women-1",
    entityId: "tie-bangalore-women",
    author: "Nandini Rao",
    authorHeadline: "Director of Product, Women in Product",
    kind: "update",
    body: "Cohort 4 applications close Friday. Twenty places, and we read every single application.",
    minutesAgo: 1300,
    likes: 67,
    comments: [],
  },
  {
    id: "p-tie-blr-angels-1",
    entityId: "tie-bangalore-angels",
    author: "Rohit Agarwal",
    authorHeadline: "Angel investor, ex-founder",
    kind: "update",
    body: "Two in diligence this month — a climate hardware seed and a devtools pre-seed. Memos went out to the syndicate this morning.",
    minutesAgo: 4100,
    likes: 31,
    comments: [c("c11", "Sarah Chen", "Partner at Horizon Ventures", "Interested in the devtools one if there's room.", 3800)],
  },
  {
    id: "p-tie-sv-1",
    entityId: "tie-siliconvalley",
    author: "Marcus Webb",
    authorHeadline: "Eng Director at Lattice",
    kind: "update",
    body: "Mentor office hours move to Wednesdays from next week. Twenty-minute slots, one per member per month — bring a specific question.",
    minutesAgo: 2700,
    likes: 52,
    comments: [],
  },
  {
    id: "p-tie-dubai-1",
    entityId: "tie-dubai",
    author: "Hana Al-Rashid",
    authorHeadline: "Investment Associate at Scale Gulf",
    kind: "event",
    body: "Gulf founders dinner on the 19th. Rule stands: bring one person who's never been to a TiE event.",
    minutesAgo: 1100,
    likes: 39,
    eventId: "evt-tie-dubai-dinner",
    comments: [],
  },

  // ------------------------------------------------------------- ISB
  {
    id: "p-isb-1",
    entityId: "isb",
    author: "Alumni Office",
    authorHeadline: "Indian School of Business",
    kind: "update",
    body: "Homecoming is the first weekend of February. Registration opens Monday and the Hyderabad campus rooms go first.",
    minutesAgo: 4400,
    likes: 128,
    comments: [c("c12", "Tara Bhatt", "Legal Counsel, startups", "Booking the Friday off already.", 4100)],
  },
  {
    id: "p-isb-2",
    entityId: "isb",
    author: "Priya Raman",
    authorHeadline: "Design Lead at Nimbus",
    kind: "career",
    body: "After four years at Nimbus I'm moving over to lead design at Driftwood. Staying in Bengaluru, still very much in the ISB orbit.",
    minutesAgo: 320,
    likes: 186,
    highlight: { emoji: "💼", title: "New role: Head of Design", subtitle: "Driftwood · Bengaluru" },
    comments: [
      c("c13", "Vikram Nair", "VP Marketing at Clearline", "Congratulations Priya — Driftwood got lucky.", 280),
      c("c14", "Lavanya Reddy", "VP Design at Clearline", "Finally. You've been doing the job for a year already.", 240),
      c("c15", "Nisha Reddy", "VP Product at Driftwood", "Thrilled about this one. Welcome aboard.", 150),
    ],
  },
  {
    id: "p-isb-pgp-1",
    entityId: "isb-pgp",
    author: "Priya Raman",
    authorHeadline: "Design Lead at Nimbus",
    kind: "ask",
    body: "Putting together a product-vs-consulting panel for the winter reunion. Looking for two people who went consulting and regret nothing, and two who left and never looked back.",
    minutesAgo: 1450,
    likes: 49,
    comments: [c("c16", "Vikram Nair", "VP Marketing at Clearline", "I'll take the 'left and never looked back' seat.", 1300)],
  },
  {
    id: "p-isb-pgp-2",
    entityId: "isb-pgp",
    author: "Tejaswini Rao",
    authorHeadline: "Strategy at Harbor",
    kind: "poll",
    body: "Reunion planning, settle this for us.",
    minutesAgo: 2000,
    likes: 22,
    poll: {
      question: "Where should the PGP reunion be?",
      options: [
        { id: "a", label: "Hyderabad campus", votes: 184 },
        { id: "b", label: "Goa", votes: 211 },
        { id: "c", label: "Bengaluru", votes: 96 },
      ],
    },
    comments: [],
  },
  {
    id: "p-isb-pgp19-1",
    entityId: "isb-pgp-2019",
    author: "Vikram Nair",
    authorHeadline: "VP Marketing at Clearline",
    kind: "event",
    body: "Five-year reunion is confirmed. Partners welcome, kids welcome, the quiz is non-negotiable.",
    minutesAgo: 2600,
    likes: 97,
    eventId: "evt-isb-reunion",
    comments: [
      c("c17", "Priya Raman", "Design Lead at Nimbus", "I'm in. Putting my hand up for the quiz.", 2400),
      c("c18", "Tara Bhatt", "Legal Counsel, startups", "Booking flights tonight.", 2100),
    ],
  },
  {
    id: "p-isb-pgp19-2",
    entityId: "isb-pgp-2019",
    author: "Tara Bhatt",
    authorHeadline: "Legal Counsel, startups",
    kind: "ask",
    body: "Class of '19 — anyone dealt with ESOP buybacks at Series B? Happy to share our term sheet language in return.",
    minutesAgo: 700,
    likes: 34,
    comments: [c("c19", "Rohit Agarwal", "Angel investor, ex-founder", "Twice. Sending you a note.", 600)],
  },
  {
    id: "p-isb-ivi-1",
    entityId: "isb-ivi",
    author: "I-Venture Desk",
    authorHeadline: "I-Venture @ ISB",
    kind: "event",
    body: "Cohort 9 demo day is on the 28th. Nine companies, an investor room, and no pitch longer than ten minutes.",
    minutesAgo: 5600,
    likes: 71,
    eventId: "evt-isb-ivi-demo",
    comments: [],
  },

  // ------------------------------------------------------- IIT Bombay
  {
    id: "p-iitb-1",
    entityId: "iitb",
    author: "Rhea Kapoor",
    authorHeadline: "Alumni relations, IIT Bombay",
    kind: "event",
    body: "Powai meet is on for Nov 8. Bring a +1 — first round is on the network.",
    minutesAgo: 2900,
    likes: 142,
    eventId: "evt-iitb-1",
    comments: [c("c20", "Arjun Bose", "Staff Engineer, Infra", "Same lawn as last year?", 2700)],
  },
  {
    id: "p-iitb-2",
    entityId: "iitb",
    author: "Arjun Bose",
    authorHeadline: "Staff Engineer, Infra",
    kind: "job",
    body: "Two infra roles open on my team. Alumni referrals skip the recruiter screen and come straight to me.",
    minutesAgo: 7000,
    likes: 88,
    job: { title: "Senior Infrastructure Engineer", company: "Nimbus", location: "Bengaluru · Hybrid" },
    comments: [c("c21", "Dev Chandran", "DevRel at Clearline", "Sent you two names.", 6700)],
  },
  {
    id: "p-iitb-3",
    entityId: "iitb",
    author: "Meera Pillai",
    authorHeadline: "Growth Lead at Northstar Labs",
    kind: "career",
    body: "Moved to Northstar Labs this month to run growth. Going from marketplaces to applied research is a bigger jump than I expected, in the good way.",
    minutesAgo: 1800,
    likes: 164,
    highlight: { emoji: "💼", title: "New role: Growth Lead", subtitle: "Northstar Labs · San Francisco" },
    comments: [c("c22", "Divya Menon", "Chief of Staff at Clearline", "Congratulations! Coffee when you're next in Bengaluru.", 1600)],
  },
  {
    id: "p-iitb-bay-1",
    entityId: "iitb-bay",
    author: "Marcus Webb",
    authorHeadline: "Eng Director at Lattice",
    kind: "event",
    body: "Palo Alto dinner on the 22nd. Twelve seats at one long table, no programme, no name tags.",
    minutesAgo: 1200,
    likes: 46,
    eventId: "evt-iitb-bay-1",
    comments: [],
  },
  {
    id: "p-iitb-blr-1",
    entityId: "iitb-blr",
    author: "Divya Menon",
    authorHeadline: "Chief of Staff at Clearline",
    kind: "update",
    body: "Chapter brunch moves to Koramangala — the new spot has actual parking, which settles the only real debate we've ever had.",
    minutesAgo: 5100,
    likes: 37,
    comments: [],
  },

  // ---------------------------------------------- Product Leadership
  {
    id: "p-prodlead-1",
    entityId: "product-leadership",
    author: "Nisha Reddy",
    authorHeadline: "VP Product at Driftwood",
    kind: "update",
    body: "Ran our first proper opportunity-solution tree session with the whole team this week. Three hours, painful, and we killed two roadmap items that had survived a year on momentum alone.",
    minutesAgo: 420,
    likes: 173,
    comments: [
      c("c23", "Vikram Nair", "VP Marketing at Clearline", "The killing-things part is the whole point and nobody writes about it.", 380),
      c("c24", "Aiko Tanaka", "Product Lead at Mercari", "Would love to see the tree if you can share a sanitised version.", 300),
    ],
  },
  {
    id: "p-prodlead-2",
    entityId: "product-leadership",
    author: "Jiwoo Kim",
    authorHeadline: "Product Lead at Coupang",
    kind: "poll",
    body: "Curious how other orgs handle this.",
    minutesAgo: 1600,
    likes: 44,
    poll: {
      question: "Who owns the roadmap at your company?",
      options: [
        { id: "a", label: "Product, full stop", votes: 231 },
        { id: "b", label: "Product + Eng jointly", votes: 318 },
        { id: "c", label: "Founder/CEO", votes: 174 },
        { id: "d", label: "Whoever shouts loudest", votes: 142 },
      ],
    },
    comments: [c("c25", "Nisha Reddy", "VP Product at Driftwood", "Option D is doing a lot of quiet work in these results.", 1400)],
  },
  {
    id: "p-prodlead-3",
    entityId: "product-leadership",
    author: "Aiko Tanaka",
    authorHeadline: "Product Lead at Mercari",
    kind: "ask",
    body: "Anyone moved a marketplace from manual trust review to automated and lived to tell it? Specifically interested in what you kept manual on purpose.",
    minutesAgo: 2300,
    likes: 61,
    comments: [c("c26", "Wei Zhang", "CTO at Groww Logistics", "We kept first-time high-value sellers manual. Never regretted it.", 2000)],
  },

  // ----------------------------------------- Angel Network (you run it)
  {
    id: "p-angel-1",
    entityId: "angel-network",
    author: "Rohit Agarwal",
    authorHeadline: "Angel investor, ex-founder",
    kind: "update",
    body: "Deal memo for the devtools pre-seed is up. ₹40L allocation left in the syndicate, closing Friday.",
    minutesAgo: 240,
    likes: 29,
    comments: [c("c27", "Sarah Chen", "Partner at Horizon Ventures", "In for ₹10L. Sending the paperwork today.", 180)],
  },
  {
    id: "p-angel-2",
    entityId: "angel-network",
    author: "Hana Al-Rashid",
    authorHeadline: "Investment Associate at Scale Gulf",
    kind: "ask",
    body: "Anyone here written into a convertible with a MENA-based founder recently? Trying to work out what's become standard on discount and cap.",
    minutesAgo: 1900,
    likes: 18,
    comments: [],
  },
  {
    id: "p-angel-3",
    entityId: "angel-network",
    author: "Rohit Agarwal",
    authorHeadline: "Angel investor, ex-founder",
    kind: "milestone",
    body: "First exit from the syndicate — the 2021 logistics cheque returned 4.2x. Small, but it's a start and it proves the pipeline works.",
    minutesAgo: 9000,
    likes: 77,
    highlight: { emoji: "📈", title: "First syndicate exit", subtitle: "4.2x · 2021 vintage" },
    comments: [],
  },

  // ------------------------------------------------------ other groups
  {
    id: "p-exg-1",
    entityId: "exgoogle",
    author: "Meera Pillai",
    authorHeadline: "Growth Lead at Northstar Labs",
    kind: "event",
    body: "Toit on the 6th. Back room is held for us.",
    minutesAgo: 1250,
    likes: 55,
    eventId: "evt-exg-1",
    comments: [],
  },
  {
    id: "p-blrf-1",
    entityId: "blr-founders",
    author: "Vikram Shah",
    authorHeadline: "Charter Member, TiE Bangalore",
    kind: "update",
    body: "Third Wave on Saturday. No agenda, no deck, just whoever turns up and whatever's broken this week.",
    minutesAgo: 4300,
    likes: 62,
    comments: [],
  },
  {
    id: "p-yc-1",
    entityId: "yc",
    author: "Rohit Agarwal",
    authorHeadline: "Angel investor, ex-founder",
    kind: "ask",
    body: "W26 applications close soon. Happy to read drafts from anyone in this network — send the link, I'll leave comments.",
    minutesAgo: 8700,
    likes: 103,
    comments: [c("c28", "Farhan Qureshi", "Founder, early-stage", "Sending mine tonight, thank you.", 8400)],
  },
  {
    id: "p-stanford-1",
    entityId: "stanford",
    author: "Jordan Lee",
    authorHeadline: "Alumni relations, Stanford",
    kind: "event",
    body: "SF social on the 14th at The Battery. Alums from every era welcome.",
    minutesAgo: 5800,
    likes: 81,
    eventId: "evt-stan-1",
    comments: [],
  },
  {
    id: "p-stan-gsb-1",
    entityId: "stanford-gsb",
    author: "Emma Whitfield",
    authorHeadline: "Head of Design at Monzo",
    kind: "update",
    body: "London GSB drinks — first Thursday of every month, same pub, no need to RSVP. Twelve people last time.",
    minutesAgo: 10000,
    likes: 48,
    comments: [],
  },
  {
    id: "p-hikers-1",
    entityId: "club-hikers",
    author: "Rohan Mehta",
    authorHeadline: "Founder, climate hardware",
    kind: "update",
    body: "Nandi Hills on Saturday, 5am start. Bring a torch — the first kilometre is properly dark.",
    minutesAgo: 2700,
    likes: 26,
    comments: [c("c29", "Kabir Singh", "Engineering Manager", "In. Bringing two more.", 2500)],
  },
  {
    id: "p-bookclub-1",
    entityId: "club-bookclub",
    author: "Tara Bhatt",
    authorHeadline: "Legal Counsel, startups",
    kind: "update",
    body: "This month: The Hard Thing About Hard Things. Dinner on the 28th, and yes you can come if you only read half.",
    minutesAgo: 9800,
    likes: 33,
    comments: [],
  },
  {
    id: "p-wip-1",
    entityId: "women-product",
    author: "Nandini Rao",
    authorHeadline: "Director of Product, Women in Product",
    kind: "update",
    body: "Mentorship sign-ups are open — twenty pairings this cohort, closing Friday.",
    minutesAgo: 6500,
    likes: 91,
    comments: [],
  },
];

/** Pending join requests waiting on an admin — the other side of "request access". */
export type JoinRequest = { id: string; entityId: string; name: string; headline: string; note: string; minutesAgo: number };

export const MOCK_JOIN_REQUESTS: JoinRequest[] = [
  { id: "jr1", entityId: "angel-network", name: "Farhan Qureshi", headline: "Founder, early-stage", note: "Exited my last company, now writing small cheques. Would like to learn the diligence side properly.", minutesAgo: 90 },
  { id: "jr2", entityId: "angel-network", name: "Priyanka Malhotra", headline: "Growth Lead at Groww Logistics", note: "Angel investing in supply chain since 2022 — six cheques so far.", minutesAgo: 400 },
  { id: "jr3", entityId: "angel-network", name: "Gabriel Souza", headline: "Staff Engineer at Nubank", note: "Looking to co-invest with people who actually read the data room.", minutesAgo: 1600 },
  { id: "jr4", entityId: "angel-network", name: "Yasmin El-Sayed", headline: "Founder, early-stage edtech", note: "MENA deal flow I'd like to share with a syndicate.", minutesAgo: 3000 },
];
