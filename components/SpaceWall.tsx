import Link from "next/link";
import { ROSTER, SPACE, asksThisWeek, proof } from "@/lib/twogether";
import Avatar from "./Avatar";

/**
 * The brag page, and the reason an operator pays.
 *
 * Every co-working space already claims "a vibrant community" on its
 * website, and every prospect on a tour discounts it, because it is
 * unfalsifiable. The entire commercial argument of this product is that it
 * replaces that sentence with a number — introductions made, coffees had,
 * share of members who met somebody new — and a number on a landing page
 * is a thing a sales team can use and a competitor cannot copy.
 *
 * Which also fixes the harder half of the sale. Nobody has a budget line
 * for "networking app". Every operator has one for retention and for
 * filling desks, and this page is the artefact that moves the product from
 * the first budget to the second.
 *
 * Only first names and companies, and only from members who said the
 * outcome could be shown. A wall that published what people were asking
 * for by full name would be the fastest way to empty the room.
 */
export default function SpaceWall() {
  const p = proof();
  const asks = asksThisWeek(120);
  const topN = Math.max(...p.topAsks.map((t) => t.n), 1);
  const share = Math.round((p.membersWhoMet / p.members) * 100);

  return (
    <main className="mx-auto w-full max-w-[860px] px-5 py-12">
      <p className="text-[12px] font-semibold tracking-wide" style={{ color: "var(--brand)" }}>
        {SPACE.name.toUpperCase()} · {SPACE.place.toUpperCase()}
      </p>
      <h1 className="mt-2 text-[34px] font-bold leading-[1.1] sm:text-[44px]">
        The desks are the same everywhere.
        <br />
        The people aren&apos;t.
      </h1>
      <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-[var(--ink-soft)]">
        Every member here says what they&apos;re working on and what they&apos;ll help with. Every morning,
        three of them get introduced to each other, with a reason and a table booked. This is what that has
        added up to.
      </p>

      {/* ------------------------------------------------------- the numbers */}
      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { n: p.intros.toLocaleString("en-IN"), label: "introductions made", sub: "since we started, by members who said yes to each other" },
          { n: p.met.toLocaleString("en-IN"), label: "actually met", sub: "a booked table, not a message nobody answered" },
          { n: `${share}%`, label: "of members met someone new", sub: `${p.membersWhoMet} of ${p.members}, this quarter` },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-[36px] font-bold leading-none" style={{ color: "var(--brand)" }}>
              {s.n}
            </p>
            <p className="mt-1.5 text-[13px] font-semibold">{s.label}</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--ink-soft)]">{s.sub}</p>
          </div>
        ))}
      </section>

      {/* ---------------------------------------------------- what's being asked */}
      <section className="mt-10">
        <h2 className="text-[19px] font-bold">What the room is asking for this week</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
          {asks.length} live asks right now. If one of these is you, somebody here has already done it.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {p.topAsks.map((t) => (
            <div key={t.topic} className="flex items-center gap-3">
              <span className="w-[120px] flex-none text-[13px] font-semibold">{t.topic}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--sunk)" }}>
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(t.n / topN) * 100}%`, background: "var(--brand)" }}
                />
              </span>
              <span className="mono w-[34px] flex-none text-right text-[12px] text-[var(--ink-soft)]">{t.n}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ stories */}
      <section className="mt-10">
        <h2 className="text-[19px] font-bold">What came of it</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {p.stories.map((s) => (
            <figure key={s.name} className="card p-4">
              <blockquote className="text-[13.5px] leading-relaxed">&ldquo;{s.line}&rdquo;</blockquote>
              <figcaption className="mt-3 flex items-center gap-2">
                <Avatar name={s.name} size={28} local />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold">{s.name.split(" ")[0]}</span>
                  <span className="block truncate text-[11px] text-[var(--ink-soft)]">{s.company}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- who's here */}
      <section className="mt-10">
        <h2 className="text-[19px] font-bold">{ROSTER.length} members</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-soft)]">
          Founders, engineers, designers, a few funds. Names and asks are members-only — this is the shape of
          the room, not its contact list.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ROSTER.slice(0, 64).map((m) => (
            <Avatar key={m.id} name={m.name} size={30} ring={2} local />
          ))}
          <span className="flex h-[30px] items-center rounded-full px-3 text-[12px] font-semibold" style={{ background: "var(--sunk)" }}>
            +{ROSTER.length - 64}
          </span>
        </div>
      </section>

      {/* --------------------------------------------------------------- cta */}
      <section className="card mt-10 p-5">
        <h2 className="text-[19px] font-bold">Take a desk, get the room</h2>
        <p className="mt-1.5 max-w-[56ch] text-[13px] leading-relaxed text-[var(--ink-soft)]">
          Membership includes the introductions. Three people a week who are working on something next to
          yours, each with a reason and a table booked. Nobody is ever asked to scroll through a directory of
          strangers.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/2gethr" className="btn btn-primary">
            See how it works
          </Link>
          <Link href="/open" className="btn btn-ghost">
            Book a tour
          </Link>
        </div>
      </section>

      <p className="mt-8 text-[11px] text-[var(--ink-soft)]">
        Prototype. Members, asks and outcomes are simulated at the real scale an operator runs, so the page
        reads the way it would after a quarter of live use.
      </p>
    </main>
  );
}
