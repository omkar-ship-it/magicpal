// Seeds invented demo professionals so the map has people on it out of the
// box. Nobody here is a real person — names, companies, and bios are made
// up for demo purposes only.
//
// A few are also marked "active" or given a live drop (see ACTIVE_EMAILS /
// DROPS below) so a first-time visitor sees the pulsing/glowing pins
// immediately, not just a map of static dots.
//
// Refuses to run against anything that isn't an obviously local database
// unless you pass --i-mean-it, so pulling prod/Neon env vars into a local
// shell by accident can't seed fake accounts into a real database.

import pg from "pg";

const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL/POSTGRES_URL set.");
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(url);
if (!isLocal && !process.argv.includes("--i-mean-it")) {
  console.error(
    `Refusing to seed a non-local database (${url.replace(/:[^:@]+@/, ":***@")}).\n` +
      `Pass --i-mean-it if you really mean to.`
  );
  process.exit(1);
}

// Spread around a dozen-plus neighbourhoods in one city, close enough
// together that the default 25km radius actually shows a busy map.
const PEOPLE = [
  {
    email: "demo.anaya@example.com",
    name: "Anaya Kulkarni",
    headline: "Product Manager at Driftwood",
    company: "Driftwood",
    bio: "Shipping B2B fintech tools. Always up for a coffee chat about PM career paths.",
    skills: ["product", "fintech", "0-to-1"],
    lat: 12.9352, lng: 77.6245, locationLabel: "Koramangala, Bengaluru",
  },
  {
    email: "demo.rohan@example.com",
    name: "Rohan Mehta",
    headline: "Engineering Lead, Platform",
    company: "Northstar Labs",
    bio: "Distributed systems and developer tooling. Mentoring junior engineers on the side.",
    skills: ["backend", "golang", "mentoring"],
    lat: 12.9719, lng: 77.6412, locationLabel: "Indiranagar, Bengaluru",
  },
  {
    email: "demo.priya@example.com",
    name: "Priya Raman",
    headline: "Design Lead at Nimbus",
    company: "Nimbus",
    bio: "Design systems and accessibility. Runs a monthly design-critique meetup.",
    skills: ["design", "design-systems", "a11y"],
    lat: 12.9279, lng: 77.6271, locationLabel: "HSR Layout, Bengaluru",
  },
  {
    email: "demo.farhan@example.com",
    name: "Farhan Qureshi",
    headline: "Founder, early-stage",
    company: "Stealth",
    bio: "Second-time founder, pre-seed. Looking to meet operators and angels nearby.",
    skills: ["fundraising", "growth", "b2b-saas"],
    lat: 12.9345, lng: 77.6101, locationLabel: "BTM Layout, Bengaluru",
  },
  {
    email: "demo.leila@example.com",
    name: "Leila D'Souza",
    headline: "Data Scientist at Harbor",
    company: "Harbor",
    bio: "ML for recommendation systems. Hosts a small reading group on applied ML.",
    skills: ["ml", "python", "recommenders"],
    lat: 12.9634, lng: 77.5855, locationLabel: "Malleswaram, Bengaluru",
  },
  {
    email: "demo.vikram@example.com",
    name: "Vikram Nair",
    headline: "VP Marketing at Clearline",
    company: "Clearline",
    bio: "B2B demand gen and brand. Happy to trade notes on GTM for early-stage products.",
    skills: ["marketing", "gtm", "b2b"],
    lat: 12.9141, lng: 77.6411, locationLabel: "Bommanahalli, Bengaluru",
  },
  {
    email: "demo.sana@example.com",
    name: "Sana Iyer",
    headline: "Product Designer, freelance",
    company: null,
    bio: "Freelance product design for early-stage startups. Open to new projects.",
    skills: ["design", "freelance", "figma"],
    lat: 12.9698, lng: 77.7500, locationLabel: "Whitefield, Bengaluru",
  },
  {
    email: "demo.arjun@example.com",
    name: "Arjun Bose",
    headline: "Staff Engineer, Infra",
    company: "Driftwood",
    bio: "Cloud infra and cost optimization. Runs internal infra guild sessions.",
    skills: ["infra", "aws", "cost-optimization"],
    lat: 13.0012, lng: 77.5710, locationLabel: "Yeshwanthpur, Bengaluru",
  },
  {
    email: "demo.meera@example.com",
    name: "Meera Pillai",
    headline: "Growth Lead at Northstar Labs",
    company: "Northstar Labs",
    bio: "Lifecycle and retention. Previously grew a DTC brand from 0 to 7 figures.",
    skills: ["growth", "lifecycle", "analytics"],
    lat: 12.9569, lng: 77.7011, locationLabel: "Marathahalli, Bengaluru",
  },
  {
    email: "demo.kabir@example.com",
    name: "Kabir Singh",
    headline: "iOS Engineer at Harbor",
    company: "Harbor",
    bio: "Swift/SwiftUI. Building a small indie app on the side — happy to compare notes.",
    skills: ["ios", "swift", "indie-apps"],
    lat: 12.9900, lng: 77.5540, locationLabel: "Rajajinagar, Bengaluru",
  },
  {
    email: "demo.tara@example.com",
    name: "Tara Bhatt",
    headline: "Legal Counsel, startups",
    company: "Bhatt & Associates",
    bio: "Fundraising docs, ESOPs, incorporation. Office hours for first-time founders.",
    skills: ["legal", "fundraising", "esops"],
    lat: 12.9180, lng: 77.6033, locationLabel: "JP Nagar, Bengaluru",
  },
  {
    email: "demo.dev@example.com",
    name: "Dev Chandran",
    headline: "DevRel at Clearline",
    company: "Clearline",
    bio: "Writes docs and gives talks so engineers don't have to. Always down to swap conference notes.",
    skills: ["devrel", "writing", "community"],
    lat: 12.9634, lng: 77.6484, locationLabel: "CV Raman Nagar, Bengaluru",
  },
  {
    email: "demo.zoya@example.com",
    name: "Zoya Khan",
    headline: "Finance Lead, early-stage",
    company: "Stealth",
    bio: "Runway planning and fundraise modelling for seed-to-Series-A startups.",
    skills: ["finance", "fundraising", "modelling"],
    lat: 12.9050, lng: 77.5900, locationLabel: "Banashankari, Bengaluru",
  },
  {
    email: "demo.aakash@example.com",
    name: "Aakash Verma",
    headline: "Founder & CEO at Stealth",
    company: "Stealth",
    bio: "Building the future of B2B payments. Raising a seed round, always happy to talk shop.",
    skills: ["fundraising", "payments", "0-to-1"],
    lat: 12.9412, lng: 77.6680, locationLabel: "Domlur, Bengaluru",
  },
  {
    email: "demo.ira@example.com",
    name: "Ira Nambiar",
    headline: "Content Strategist, freelance",
    company: null,
    bio: "Brand voice and content systems for B2B SaaS. Currently booking Q1 clients.",
    skills: ["content", "brand", "freelance"],
    lat: 12.9784, lng: 77.6408, locationLabel: "Old Airport Road, Bengaluru",
  },
  {
    email: "demo.yusuf@example.com",
    name: "Yusuf Ali",
    headline: "Backend Engineer at Nimbus",
    company: "Nimbus",
    bio: "Payments infra and reliability. Into distance running and bad puns.",
    skills: ["backend", "payments", "reliability"],
    lat: 12.9095, lng: 77.6453, locationLabel: "HSR Sector 7, Bengaluru",
  },
];

// A second cluster, one per continent-ish, so "My Network" has a genuinely
// worldwide set of people to discover — not just the Bengaluru crowd above.
const WORLD_PEOPLE = [
  {
    email: "demo.sarah@example.com",
    name: "Sarah Chen",
    headline: "Partner at Horizon Ventures",
    company: "Horizon Ventures",
    bio: "Early-stage B2B SaaS. Writes a widely-read newsletter on fundraising mechanics.",
    skills: ["venture-capital", "fundraising", "saas"],
    lat: 37.7749, lng: -122.4194, locationLabel: "San Francisco, USA",
  },
  {
    email: "demo.marcus@example.com",
    name: "Marcus Webb",
    headline: "Eng Director at Lattice",
    company: "Lattice",
    bio: "Platform and infra at scale. Ex-Stripe. Runs a small engineering-leadership book club.",
    skills: ["engineering-leadership", "platform", "scale"],
    lat: 40.7128, lng: -74.006, locationLabel: "New York, USA",
  },
  {
    email: "demo.emma@example.com",
    name: "Emma Whitfield",
    headline: "Head of Design at Monzo",
    company: "Monzo",
    bio: "Fintech design systems. Occasional mentor for design bootcamp grads.",
    skills: ["design", "fintech", "mentoring"],
    lat: 51.5072, lng: -0.1276, locationLabel: "London, UK",
  },
  {
    email: "demo.lukas@example.com",
    name: "Lukas Richter",
    headline: "Founder at Sonnenlicht",
    company: "Sonnenlicht",
    bio: "Climate-tech, pre-seed. Previously built and sold a logistics startup.",
    skills: ["climate-tech", "fundraising", "logistics"],
    lat: 52.52, lng: 13.405, locationLabel: "Berlin, Germany",
  },
  {
    email: "demo.aiko@example.com",
    name: "Aiko Tanaka",
    headline: "Product Lead at Mercari",
    company: "Mercari",
    bio: "Marketplace growth and trust & safety. Speaks regularly at product meetups.",
    skills: ["product", "marketplace", "growth"],
    lat: 35.6762, lng: 139.6503, locationLabel: "Tokyo, Japan",
  },
  {
    email: "demo.wei@example.com",
    name: "Wei Zhang",
    headline: "CTO at Groww Logistics",
    company: "Groww Logistics",
    bio: "Supply-chain systems across Southeast Asia. Angel investing on the side.",
    skills: ["supply-chain", "cto", "angel-investing"],
    lat: 1.3521, lng: 103.8198, locationLabel: "Singapore",
  },
  {
    email: "demo.olivia@example.com",
    name: "Olivia Bennett",
    headline: "Growth Lead at Canva",
    company: "Canva",
    bio: "Lifecycle marketing at scale. Runs a small newsletter for APAC growth folks.",
    skills: ["growth", "lifecycle", "marketing"],
    lat: -33.8688, lng: 151.2093, locationLabel: "Sydney, Australia",
  },
  {
    email: "demo.kwame@example.com",
    name: "Kwame Asante",
    headline: "Founder at Fawaza Pay",
    company: "Fawaza Pay",
    bio: "Mobile payments for informal markets. Raising a seed round across three countries.",
    skills: ["fintech", "payments", "fundraising"],
    lat: 6.5244, lng: 3.3792, locationLabel: "Lagos, Nigeria",
  },
  {
    email: "demo.amara@example.com",
    name: "Amara Njoroge",
    headline: "Head of Partnerships at Flux",
    company: "Flux",
    bio: "Ecosystem partnerships across East Africa's fintech scene.",
    skills: ["partnerships", "fintech", "ecosystem"],
    lat: -1.2921, lng: 36.8219, locationLabel: "Nairobi, Kenya",
  },
  {
    email: "demo.gabriel@example.com",
    name: "Gabriel Souza",
    headline: "Staff Engineer at Nubank",
    company: "Nubank",
    bio: "Core banking infra at scale. Writes about distributed systems in Portuguese and English.",
    skills: ["backend", "distributed-systems", "fintech"],
    lat: -23.5505, lng: -46.6333, locationLabel: "São Paulo, Brazil",
  },
  {
    email: "demo.hana@example.com",
    name: "Hana Al-Rashid",
    headline: "Investment Associate at Scale Gulf",
    company: "Scale Gulf",
    bio: "Seed-stage investing across MENA. Previously operator at a logistics unicorn.",
    skills: ["venture-capital", "mena", "logistics"],
    lat: 25.2048, lng: 55.2708, locationLabel: "Dubai, UAE",
  },
  {
    email: "demo.noah@example.com",
    name: "Noah Fortin",
    headline: "Founder at Boreal Robotics",
    company: "Boreal Robotics",
    bio: "Agri-robotics for cold climates. Fresh off a Series A.",
    skills: ["robotics", "agritech", "hardware"],
    lat: 43.6532, lng: -79.3832, locationLabel: "Toronto, Canada",
  },
];

const ALL_PEOPLE = [...PEOPLE, ...WORLD_PEOPLE];

// Emails from ALL_PEOPLE that should look "active" (heartbeat within the
// last few minutes) the moment the seed finishes running.
const ACTIVE_EMAILS = [
  "demo.rohan@example.com",
  "demo.priya@example.com",
  "demo.dev@example.com",
  "demo.sarah@example.com",
  "demo.aiko@example.com",
];

// At most one live drop per person — these get an actual row in `drops`.
const DROPS = [
  { email: "demo.anaya@example.com", label: "At Third Wave, open to chat about fintech", minutes: 90 },
  { email: "demo.aakash@example.com", label: "Grabbing coffee near Domlur, say hi", minutes: 45 },
  { email: "demo.marcus@example.com", label: "At a coffee shop in SoHo, open to chat", minutes: 60 },
];

const pool = new pg.Pool({ connectionString: url });

async function main() {
  let inserted = 0;
  const idByEmail = new Map();

  for (const p of ALL_PEOPLE) {
    const res = await pool.query(
      `insert into users (email, name, headline, company, bio, skills, lat, lng, location_label, visible_on_map)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       on conflict (email) do nothing
       returning id`,
      [p.email, p.name, p.headline, p.company, p.bio, p.skills, p.lat, p.lng, p.locationLabel]
    );
    if (res.rowCount) {
      inserted++;
      idByEmail.set(p.email, res.rows[0].id);
    } else {
      const existing = await pool.query(`select id from users where email = $1`, [p.email]);
      idByEmail.set(p.email, existing.rows[0]?.id);
    }
  }

  if (ACTIVE_EMAILS.length) {
    await pool.query(`update users set last_active_at = now() where email = any($1)`, [ACTIVE_EMAILS]);
  }

  for (const d of DROPS) {
    const userId = idByEmail.get(d.email);
    if (!userId) continue;
    const person = ALL_PEOPLE.find((p) => p.email === d.email);
    await pool.query(`delete from drops where user_id = $1`, [userId]);
    await pool.query(
      `insert into drops (user_id, lat, lng, label, expires_at) values ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
      [userId, person.lat, person.lng, d.label, d.minutes]
    );
  }

  console.log(`Seeded ${inserted} new demo profile(s) (${ALL_PEOPLE.length - inserted} already existed).`);
  console.log(`Marked ${ACTIVE_EMAILS.length} as active, refreshed ${DROPS.length} live drop(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
