// Seeds invented demo professionals so the map has people on it out of the
// box. Nobody here is a real person — names, companies, and bios are made
// up for demo purposes only.
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

// Spread around a handful of neighbourhoods in one city, close enough
// together that the default 25km radius actually shows several people.
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
];

const pool = new pg.Pool({ connectionString: url });

async function main() {
  let inserted = 0;
  for (const p of PEOPLE) {
    const res = await pool.query(
      `insert into users (email, name, headline, company, bio, skills, lat, lng, location_label, visible_on_map)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       on conflict (email) do nothing
       returning id`,
      [p.email, p.name, p.headline, p.company, p.bio, p.skills, p.lat, p.lng, p.locationLabel]
    );
    if (res.rowCount) inserted++;
  }
  console.log(`Seeded ${inserted} new demo profile(s) (${PEOPLE.length - inserted} already existed).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
