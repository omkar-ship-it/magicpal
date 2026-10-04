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
  {
    email: "demo.nisha@example.com",
    name: "Nisha Reddy",
    headline: "VP Product at Driftwood",
    company: "Driftwood",
    bio: "10 years in fintech product. Mentors first-time PMs on Thursdays.",
    skills: ["product", "fintech", "leadership"],
    linkedinUrl: "https://linkedin.com/in/nisha-reddy-demo",
    lat: 12.9718, lng: 77.6190, locationLabel: "Ulsoor, Bengaluru",
  },
  {
    email: "demo.rahul@example.com",
    name: "Rahul Varma",
    headline: "Founder, early-stage climate-tech",
    company: "Stealth",
    bio: "Building carbon accounting for Indian manufacturers. Pre-seed, raising soon.",
    skills: ["climate-tech", "fundraising", "b2b"],
    websiteUrl: "https://rahulvarma-demo.com",
    lat: 12.9256, lng: 77.5468, locationLabel: "Vijayanagar, Bengaluru",
  },
  {
    email: "demo.pooja@example.com",
    name: "Pooja Shetty",
    headline: "ML Engineer at Harbor",
    company: "Harbor",
    bio: "Recommender systems and ranking. Writes a small newsletter on applied ML in India.",
    skills: ["ml", "ranking", "python"],
    instagramUrl: "https://instagram.com/pooja.demo",
    lat: 12.9850, lng: 77.5533, locationLabel: "Malleswaram, Bengaluru",
  },
  {
    email: "demo.ananya@example.com",
    name: "Ananya Krishnan",
    headline: "Brand Designer, freelance",
    company: null,
    bio: "Identity and packaging design for D2C brands. Taking two new clients this quarter.",
    skills: ["branding", "design", "freelance"],
    instagramUrl: "https://instagram.com/ananya.design.demo",
    websiteUrl: "https://ananyakrishnan-demo.com",
    lat: 12.9180, lng: 77.6408, locationLabel: "Koramangala 8th Block, Bengaluru",
  },
  {
    email: "demo.vivek@example.com",
    name: "Vivek Pillai",
    headline: "Site Reliability Engineer at Nimbus",
    company: "Nimbus",
    bio: "On-call for payments uptime. Building a home lab Kubernetes cluster for fun.",
    skills: ["sre", "kubernetes", "payments"],
    linkedinUrl: "https://linkedin.com/in/vivek-pillai-demo",
    lat: 13.0049, lng: 77.5694, locationLabel: "Malleswaram West, Bengaluru",
  },
  {
    email: "demo.divya@example.com",
    name: "Divya Menon",
    headline: "Chief of Staff at Clearline",
    company: "Clearline",
    bio: "Ops, hiring, and the thousand small things that keep a Series B running.",
    skills: ["operations", "hiring", "strategy"],
    lat: 12.9634, lng: 77.6963, locationLabel: "Whitefield, Bengaluru",
  },
  {
    email: "demo.rohit@example.com",
    name: "Rohit Agarwal",
    headline: "Angel investor, ex-founder",
    company: null,
    bio: "Sold my last company in 2023. Now writing small checks into seed-stage B2B SaaS.",
    skills: ["angel-investing", "b2b-saas", "mentoring"],
    linkedinUrl: "https://linkedin.com/in/rohit-agarwal-demo",
    websiteUrl: "https://rohitagarwal-demo.com",
    lat: 12.9081, lng: 77.6476, locationLabel: "HSR Layout Sector 2, Bengaluru",
  },
  {
    email: "demo.simran@example.com",
    name: "Simran Kaur",
    headline: "Growth PM at Northstar Labs",
    company: "Northstar Labs",
    bio: "Onboarding and activation. Previously grew a consumer app to 2M MAU.",
    skills: ["product", "growth", "onboarding"],
    lat: 12.9447, lng: 77.5631, locationLabel: "Basavanagudi, Bengaluru",
  },
  {
    email: "demo.karthik@example.com",
    name: "Karthik Subramaniam",
    headline: "Data Engineer at Harbor",
    company: "Harbor",
    bio: "Pipelines and warehousing. Runs a weekend cricket league for the tech crowd.",
    skills: ["data-engineering", "sql", "airflow"],
    lat: 12.8452, lng: 77.6602, locationLabel: "Electronic City, Bengaluru",
  },
  {
    email: "demo.megha@example.com",
    name: "Megha Iyer",
    headline: "Partnerships Lead at Driftwood",
    company: "Driftwood",
    bio: "Bank and NBFC partnerships for embedded finance. Always travelling for work.",
    skills: ["partnerships", "fintech", "bd"],
    lat: 13.0358, lng: 77.5970, locationLabel: "Hebbal, Bengaluru",
  },
  {
    email: "demo.suresh@example.com",
    name: "Suresh Pai",
    headline: "Founder, developer tools",
    company: "Stealth",
    bio: "Building observability tooling for small eng teams. Pre-seed, bootstrapped so far.",
    skills: ["devtools", "observability", "bootstrapped"],
    lat: 12.9010, lng: 77.6870, locationLabel: "Sarjapur Road, Bengaluru",
  },
];

// Your current city gets its own dense cluster too, not just a single pin —
// invented people, spread across the same neighbourhoods a real local
// network would actually be in.
const HYDERABAD_PEOPLE = [
  {
    email: "demo.anika@example.com",
    name: "Anika Rao",
    headline: "Engineering Manager at Nimbus",
    company: "Nimbus",
    bio: "Leads the payments platform team. Runs an internal 'build in public' demo day.",
    skills: ["engineering-leadership", "payments", "platform"],
    linkedinUrl: "https://linkedin.com/in/anika-rao-demo",
    lat: 17.4474, lng: 78.3762, locationLabel: "Hitech City, Hyderabad",
  },
  {
    email: "demo.imran@example.com",
    name: "Imran Baig",
    headline: "Founder, early-stage healthtech",
    company: "Stealth",
    bio: "Building diagnostics software for tier-2 city clinics. Raising a seed round.",
    skills: ["healthtech", "fundraising", "b2b"],
    lat: 17.4401, lng: 78.3489, locationLabel: "Gachibowli, Hyderabad",
  },
  {
    email: "demo.lavanya@example.com",
    name: "Lavanya Reddy",
    headline: "VP Design at Clearline",
    company: "Clearline",
    bio: "Design org of 12 across three time zones. Mentors junior designers monthly.",
    skills: ["design-leadership", "design-systems", "mentoring"],
    instagramUrl: "https://instagram.com/lavanya.design.demo",
    lat: 17.4156, lng: 78.4347, locationLabel: "Banjara Hills, Hyderabad",
  },
  {
    email: "demo.farooq@example.com",
    name: "Farooq Ahmed",
    headline: "Staff Engineer at Harbor",
    company: "Harbor",
    bio: "Search and ranking infra. Previously at a FAANG search team.",
    skills: ["search", "backend", "ranking"],
    lat: 17.4239, lng: 78.4738, locationLabel: "Jubilee Hills, Hyderabad",
  },
  {
    email: "demo.swathi@example.com",
    name: "Swathi Chowdary",
    headline: "Product Manager at Driftwood",
    company: "Driftwood",
    bio: "Lending products for small businesses. Previously founded a fintech startup.",
    skills: ["product", "lending", "fintech"],
    linkedinUrl: "https://linkedin.com/in/swathi-chowdary-demo",
    lat: 17.4483, lng: 78.3915, locationLabel: "Madhapur, Hyderabad",
  },
  {
    email: "demo.naveen@example.com",
    name: "Naveen Kumar Reddy",
    headline: "CTO at Fawaza Pay",
    company: "Fawaza Pay",
    bio: "Infra and security for a payments startup. Ex-banking tech.",
    skills: ["cto", "security", "payments"],
    lat: 17.4474, lng: 78.3652, locationLabel: "Kondapur, Hyderabad",
  },
  {
    email: "demo.pranathi@example.com",
    name: "Pranathi Rao",
    headline: "Marketing Lead at Northstar Labs",
    company: "Northstar Labs",
    bio: "Brand and performance marketing. Runs a small marketing meetup every month.",
    skills: ["marketing", "brand", "performance"],
    websiteUrl: "https://pranathirao-demo.com",
    lat: 17.4399, lng: 78.4983, locationLabel: "Secunderabad, Hyderabad",
  },
  {
    email: "demo.vikas@example.com",
    name: "Vikas Goud",
    headline: "Angel investor, ex-operator",
    company: null,
    bio: "Early operator at two unicorns. Now writing checks into Hyderabad-based startups.",
    skills: ["angel-investing", "operations", "mentoring"],
    lat: 17.4440, lng: 78.4482, locationLabel: "Begumpet, Hyderabad",
  },
  {
    email: "demo.tejaswini@example.com",
    name: "Tejaswini Rao",
    headline: "Senior Designer, freelance",
    company: null,
    bio: "Product design for early-stage SaaS. Open to new freelance projects this quarter.",
    skills: ["design", "freelance", "saas"],
    instagramUrl: "https://instagram.com/tejaswini.design.demo",
    lat: 17.4849, lng: 78.4138, locationLabel: "Kukatpally, Hyderabad",
  },
  {
    email: "demo.chandan@example.com",
    name: "Chandan Reddy",
    headline: "Founder & CEO, logistics-tech",
    company: "Stealth",
    bio: "Last-mile delivery optimization for D2C brands. Series A, scaling the team.",
    skills: ["logistics", "fundraising", "0-to-1"],
    linkedinUrl: "https://linkedin.com/in/chandan-reddy-demo",
    lat: 17.3850, lng: 78.4867, locationLabel: "Ameerpet, Hyderabad",
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
    linkedinUrl: "https://linkedin.com/in/sarah-chen-demo",
    websiteUrl: "https://sarahchen-demo.com",
    lat: 37.7749, lng: -122.4194, locationLabel: "San Francisco, USA",
  },
  {
    email: "demo.marcus@example.com",
    name: "Marcus Webb",
    headline: "Eng Director at Lattice",
    company: "Lattice",
    bio: "Platform and infra at scale. Ex-Stripe. Runs a small engineering-leadership book club.",
    skills: ["engineering-leadership", "platform", "scale"],
    linkedinUrl: "https://linkedin.com/in/marcus-webb-demo",
    lat: 40.7128, lng: -74.006, locationLabel: "New York, USA",
  },
  {
    email: "demo.emma@example.com",
    name: "Emma Whitfield",
    headline: "Head of Design at Monzo",
    company: "Monzo",
    bio: "Fintech design systems. Occasional mentor for design bootcamp grads.",
    skills: ["design", "fintech", "mentoring"],
    instagramUrl: "https://instagram.com/emma.whitfield.demo",
    websiteUrl: "https://emmawhitfield-demo.com",
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
  {
    email: "demo.priyanka@example.com",
    name: "Priyanka Malhotra",
    headline: "Growth Lead at Groww Logistics",
    company: "Groww Logistics",
    bio: "Supply-chain growth across South Asia. Splits time between Mumbai and Singapore.",
    skills: ["growth", "supply-chain", "southeast-asia"],
    linkedinUrl: "https://linkedin.com/in/priyanka-malhotra-demo",
    lat: 19.0760, lng: 72.8777, locationLabel: "Mumbai, India",
  },
  {
    email: "demo.jiwoo@example.com",
    name: "Jiwoo Kim",
    headline: "Product Lead at Coupang",
    company: "Coupang",
    bio: "Logistics and fulfillment product. Writes about e-commerce ops in Korean and English.",
    skills: ["product", "logistics", "ecommerce"],
    lat: 37.5665, lng: 126.978, locationLabel: "Seoul, South Korea",
  },
  {
    email: "demo.elin@example.com",
    name: "Elin Berg",
    headline: "Founder at Nordlys Climate",
    company: "Nordlys Climate",
    bio: "Carbon-capture hardware, pre-seed. Previously a researcher at KTH.",
    skills: ["climate-tech", "hardware", "research"],
    websiteUrl: "https://nordlysclimate-demo.com",
    lat: 59.3293, lng: 18.0686, locationLabel: "Stockholm, Sweden",
  },
  {
    email: "demo.diego@example.com",
    name: "Diego Fernández",
    headline: "Engineering Director at Kavak",
    company: "Kavak",
    bio: "Marketplace and trust infra for LatAm's largest used-car platform.",
    skills: ["engineering-leadership", "marketplace", "latam"],
    lat: 19.4326, lng: -99.1332, locationLabel: "Mexico City, Mexico",
  },
  {
    email: "demo.yasmin@example.com",
    name: "Yasmin El-Sayed",
    headline: "Founder, early-stage edtech",
    company: "Stealth",
    bio: "Arabic-first learning platform for K-12. Raising a seed round across MENA.",
    skills: ["edtech", "fundraising", "mena"],
    lat: 30.0444, lng: 31.2357, locationLabel: "Cairo, Egypt",
  },
];

const ALL_PEOPLE = [...PEOPLE, ...HYDERABAD_PEOPLE, ...WORLD_PEOPLE];

// Emails from ALL_PEOPLE that should look "active" (heartbeat within the
// last few minutes) the moment the seed finishes running.
const ACTIVE_EMAILS = [
  "demo.rohan@example.com",
  "demo.priya@example.com",
  "demo.dev@example.com",
  "demo.sarah@example.com",
  "demo.aiko@example.com",
  "demo.anika@example.com",
  "demo.swathi@example.com",
];

// At most one live drop per person — these get an actual row in `drops`.
const DROPS = [
  { email: "demo.anaya@example.com", label: "At Third Wave, open to chat about fintech", minutes: 90 },
  { email: "demo.aakash@example.com", label: "Grabbing coffee near Domlur, say hi", minutes: 45 },
  { email: "demo.marcus@example.com", label: "At a coffee shop in SoHo, open to chat", minutes: 60 },
  { email: "demo.lavanya@example.com", label: "At Roastery Coffee House, open to chat about design", minutes: 75 },
];

const pool = new pg.Pool({ connectionString: url });

async function main() {
  let inserted = 0;
  const idByEmail = new Map();

  for (const p of ALL_PEOPLE) {
    const res = await pool.query(
      `insert into users (email, name, headline, company, bio, skills, lat, lng, location_label, visible_on_map, linkedin_url, instagram_url, website_url)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, $12)
       on conflict (email) do nothing
       returning id`,
      [
        p.email, p.name, p.headline, p.company, p.bio, p.skills, p.lat, p.lng, p.locationLabel,
        p.linkedinUrl ?? null, p.instagramUrl ?? null, p.websiteUrl ?? null,
      ]
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
