// End-to-end coverage for the core MagicPal loop: sign in, build a profile,
// show up on the map, connect, and message — run against a real server this
// script spawns itself (on its own port, so it doesn't collide with a dev
// server you already have open) and a real Postgres database.
//
// OTP codes never touch the database in plaintext (they're scrypt-hashed),
// so this reads them the same way a developer would with no email provider
// configured: straight out of the server's console log.

import { spawn } from "node:child_process";
import pg from "pg";

const PORT = 3177;
const BASE = `http://localhost:${PORT}`;
const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!url) {
  console.error("No DATABASE_URL/POSTGRES_URL set — run with .env.local loaded.");
  process.exit(1);
}
if (!/localhost|127\.0\.0\.1/.test(url)) {
  console.error("Refusing to run flow tests against a non-local database.");
  process.exit(1);
}

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}`);
  }
}

// ---------------------------------------------------------- tiny cookie jar
function makeJar() {
  let cookie = "";
  return {
    headers: () => (cookie ? { Cookie: cookie } : {}),
    capture: (res) => {
      const set = res.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
    },
  };
}

async function api(path, { method = "GET", jar, body } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        method,
        headers: { "Content-Type": "application/json", ...(jar ? jar.headers() : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (jar) jar.capture(res);
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw lastErr;
}

// --------------------------------------------------------------- otp codes
let serverLog = "";
function waitForOtp(email, timeoutMs = 5000) {
  const re = new RegExp(`login code for ${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} is (\\d{6})`);
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const m = serverLog.match(re);
      if (m) return resolve(m[1]);
      if (Date.now() - start > timeoutMs) return reject(new Error(`Timed out waiting for OTP for ${email}`));
      setTimeout(tick, 100);
    };
    tick();
  });
}

async function signUp(email) {
  const jar = makeJar();
  await api("/api/auth/request-otp", { method: "POST", jar, body: { email } });
  const code = await waitForOtp(email);
  const { data } = await api("/api/auth/verify-otp", { method: "POST", jar, body: { email, code } });
  return { jar, userId: null, email, onboarded: data.onboarded };
}

async function main() {
  console.log(`Starting server on :${PORT}…`);
  const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => (serverLog += d.toString()));
  server.stderr.on("data", (d) => (serverLog += d.toString()));

  await new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (/Another next dev server is already running/.test(serverLog)) {
        return reject(new Error("Another `next dev` is already running for this project — stop it first (Next.js only allows one per project dir)."));
      }
      if (/Ready in/.test(serverLog)) return resolve();
      if (Date.now() - start > 20000) return reject(new Error("Server didn't start in time"));
      setTimeout(tick, 150);
    };
    tick();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const pool = new pg.Pool({ connectionString: url });
  const stamp = Date.now();
  const emailA = `flowtest.a.${stamp}@example.com`;
  const emailB = `flowtest.b.${stamp}@example.com`;
  const emailC = `flowtest.c.${stamp}@example.com`;

  try {
    console.log("\nAuth + onboarding");
    const a = await signUp(emailA);
    assert(a.onboarded === false, "new account starts un-onboarded");

    const profileA = await api("/api/profile", {
      method: "POST",
      jar: a.jar,
      body: {
        name: "Flow Alice",
        headline: "Test PM",
        locationLabel: "Koramangala, Bengaluru",
        lat: 12.9352,
        lng: 77.6245,
        visibleOnMap: true,
      },
    });
    assert(profileA.status === 200, "profile saves with a location");

    const b = await signUp(emailB);
    const profileB = await api("/api/profile", {
      method: "POST",
      jar: b.jar,
      body: {
        name: "Flow Bob",
        headline: "Test Designer",
        skills: ["design"],
        locationLabel: "Indiranagar, Bengaluru",
        lat: 12.9981,
        lng: 77.6245,
        visibleOnMap: true,
      },
    });
    assert(profileB.status === 200, "second profile saves with a location");

    console.log("\nNearby / map");
    const nearWide = await api(`/api/nearby?lat=12.9352&lng=77.6245&radiusKm=10`, { jar: a.jar });
    const bobEntry = nearWide.data.profiles.find((p) => p.name === "Flow Bob");
    assert(Boolean(bobEntry), "bob (~7km away) shows up within 10km");
    assert(bobEntry && (bobEntry.lat !== 12.9981 || bobEntry.lng !== 77.6245), "bob's displayed coordinates are jittered, not exact");
    assert(bobEntry && bobEntry.active === false, "bob isn't 'active' before ever sending a heartbeat");

    // 5km and 10km are both valid RADIUS_OPTIONS_KM — an out-of-list value
    // like 1km silently falls back to the default radius, which would make
    // this assertion pass for the wrong reason.
    const nearNarrow = await api(`/api/nearby?lat=12.9352&lng=77.6245&radiusKm=5`, { jar: a.jar });
    assert(
      !nearNarrow.data.profiles.find((p) => p.name === "Flow Bob") && nearWide.data.profiles.some((p) => p.name === "Flow Bob"),
      "radius filter actually excludes people past the chosen distance"
    );

    console.log("\nAnonymous browsing (map-first homepage, no login wall)");
    const anonNear = await api(`/api/nearby?lat=12.9352&lng=77.6245&radiusKm=10`);
    assert(anonNear.status === 200, "signed-out visitors can load the map without a 401");
    assert(anonNear.data.profiles.some((p) => p.name === "Flow Bob"), "signed-out visitors see real nearby profiles");
    const anonConnect = await api("/api/connections", { method: "POST", body: { toUserId: bobEntry.id } });
    assert(anonConnect.status === 401, "signed-out visitors still can't send connection requests");

    console.log("\nVisibility toggle");
    await api("/api/profile", {
      method: "POST",
      jar: b.jar,
      body: { name: "Flow Bob", headline: "Test Designer", skills: ["design"], visibleOnMap: false },
    });
    const nearAfterHide = await api(`/api/nearby?lat=12.9352&lng=77.6245&radiusKm=10`, { jar: a.jar });
    assert(!nearAfterHide.data.profiles.find((p) => p.name === "Flow Bob"), "turning visibility off removes bob from everyone's map");
    await api("/api/profile", {
      method: "POST",
      jar: b.jar,
      body: { name: "Flow Bob", headline: "Test Designer", skills: ["design"], visibleOnMap: true },
    });

    console.log("\nPresence pulse");
    const heartbeat = await api("/api/presence/heartbeat", { method: "POST", jar: b.jar });
    assert(heartbeat.status === 200, "heartbeat accepted");
    const nearAfterHeartbeat = await api(`/api/nearby?lat=12.9352&lng=77.6245&radiusKm=10`, { jar: a.jar });
    const bobActive = nearAfterHeartbeat.data.profiles.find((p) => p.name === "Flow Bob");
    assert(bobActive?.active === true, "bob shows as active right after his own heartbeat");

    console.log("\nTime-boxed drops");
    await api("/api/profile", { method: "POST", jar: b.jar, body: { name: "Flow Bob", headline: "Test Designer", skills: ["design"], visibleOnMap: false } });
    const dropWhileHidden = await api("/api/drops", { method: "POST", jar: b.jar, body: { label: "At the cafe", durationMinutes: 60 } });
    assert(dropWhileHidden.status === 400, "can't drop a pin while hidden from the map");
    await api("/api/profile", { method: "POST", jar: b.jar, body: { name: "Flow Bob", headline: "Test Designer", skills: ["design"], visibleOnMap: true } });

    const dropCreate = await api("/api/drops", { method: "POST", jar: b.jar, body: { label: "At the cafe, say hi", durationMinutes: 60 } });
    assert(dropCreate.status === 200 && dropCreate.data.drop?.label === "At the cafe, say hi", "drop creates with the given label");

    const myDrop = await api("/api/drops", { jar: b.jar });
    assert(myDrop.data.drop?.label === "At the cafe, say hi", "the owner can read back their own active drop");

    const nearWithDrop = await api(`/api/nearby?lat=12.9352&lng=77.6245&radiusKm=10`, { jar: a.jar });
    const bobWithDrop = nearWithDrop.data.profiles.find((p) => p.name === "Flow Bob");
    assert(bobWithDrop?.drop?.label === "At the cafe, say hi", "someone else sees bob's live drop on the map");

    const dropReplace = await api("/api/drops", { method: "POST", jar: b.jar, body: { label: "Actually at the park", durationMinutes: 30 } });
    assert(dropReplace.data.drop?.label === "Actually at the park", "creating a new drop replaces the old one, not stacks");

    await api("/api/drops", { method: "DELETE", jar: b.jar });
    const nearAfterCancel = await api(`/api/nearby?lat=12.9352&lng=77.6245&radiusKm=10`, { jar: a.jar });
    const bobAfterCancel = nearAfterCancel.data.profiles.find((p) => p.name === "Flow Bob");
    assert(bobAfterCancel?.drop === null, "ending a drop removes it from everyone's map immediately");

    console.log("\nConnections");
    const req1 = await api("/api/connections", { method: "POST", jar: a.jar, body: { toUserId: bobEntry.id } });
    assert(req1.status === 200 && req1.data.status === "pending", "connection request sent");
    const req2 = await api("/api/connections", { method: "POST", jar: a.jar, body: { toUserId: bobEntry.id } });
    assert(req2.status === 200 && req2.data.status === "pending", "asking twice doesn't error");

    const { data: statusCheck } = await api(`/api/connections?with=${bobEntry.id}`, { jar: a.jar });
    const connectionId = statusCheck.connectionId;
    assert(Boolean(connectionId), "exactly one connection row exists for the pair");

    const { rows: dupeCheck } = await pool.query(
      `select count(*)::int as n from connections where (user_a_id, user_b_id) in (select user_a_id, user_b_id from connections where id = $1)`,
      [connectionId]
    );
    assert(dupeCheck[0].n === 1, "the unique index allows exactly one row for this pair");

    const selfAccept = await api(`/api/connections/${connectionId}/respond`, { method: "POST", jar: a.jar, body: { accept: true } });
    assert(selfAccept.status === 404, "the requester can't accept their own request");

    const accept = await api(`/api/connections/${connectionId}/respond`, { method: "POST", jar: b.jar, body: { accept: true } });
    assert(accept.status === 200 && accept.data.status === "accepted", "the recipient can accept");

    console.log("\nWorldwide network view");
    const networkA = await api("/api/connections/map", { jar: a.jar });
    assert(networkA.status === 200, "network endpoint responds");
    const bobInNetwork = networkA.data.points.find((p) => p.name === "Flow Bob");
    assert(Boolean(bobInNetwork) && typeof bobInNetwork.connectionId === "string", "accepted connection shows up with its connection id");
    assert(bobInNetwork.lat !== 12.9981 || bobInNetwork.lng !== 77.6245, "network view also jitters coordinates");

    await api("/api/profile", { method: "POST", jar: b.jar, body: { name: "Flow Bob", headline: "Test Designer", skills: ["design"], visibleOnMap: false } });
    const networkAfterHide = await api("/api/connections/map", { jar: a.jar });
    assert(!networkAfterHide.data.points.find((p) => p.name === "Flow Bob"), "hiding visibility removes a connection from the network view too");
    await api("/api/profile", { method: "POST", jar: b.jar, body: { name: "Flow Bob", headline: "Test Designer", skills: ["design"], visibleOnMap: true } });

    const networkAnon = await api("/api/connections/map");
    assert(networkAnon.status === 401, "signed-out visitors can't fetch someone's network");

    console.log("\nMessaging");
    const send = await api("/api/messages", { method: "POST", jar: b.jar, body: { connectionId, body: "hello from bob" } });
    assert(send.status === 200, "message sends once accepted");

    const read = await api(`/api/messages?connectionId=${connectionId}`, { jar: a.jar });
    assert(read.data.messages?.length === 1 && read.data.messages[0].readAt, "recipient reading the thread marks it read");

    const c = await signUp(emailC);
    const snoopRead = await api(`/api/messages?connectionId=${connectionId}`, { jar: c.jar });
    assert(snoopRead.status === 404, "a stranger can't read someone else's thread");
    const snoopSend = await api("/api/messages", { method: "POST", jar: c.jar, body: { connectionId, body: "hi" } });
    assert(snoopSend.status === 403, "a stranger can't post into someone else's thread");

    console.log(`\n${pass} passed, ${fail} failed`);
  } finally {
    await pool.query("delete from users where email = any($1)", [[emailA, emailB, emailC]]);
    await pool.end();
    server.kill();
  }

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
