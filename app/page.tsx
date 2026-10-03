import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function Home() {
  const user = await getSessionUser();
  if (user?.onboarded) redirect("/map");
  if (user) redirect("/profile");

  return (
    <div className="flex flex-col gap-20">
      <section className="grid items-center gap-12 pt-6 md:grid-cols-2 md:pt-14">
        <div>
          <span className="pill" style={{ background: "var(--sunk)", color: "var(--brand-deep)" }}>
            now in your city
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] md:text-5xl">
            The right room isn&apos;t a conference. It&apos;s the map around you.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-[var(--ink-soft)]">
            MagicPal shows you the professionals nearby right now — filter by distance,
            see what they do, and send a note. Step off the map whenever you want privacy back.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn btn-primary">
              Find your people
            </Link>
            <a href="#how" className="btn btn-ghost">
              How it works
            </a>
          </div>
        </div>

        <div className="card relative mx-auto flex h-72 w-full max-w-sm items-center justify-center overflow-hidden md:h-96">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 55%), radial-gradient(circle at 70% 65%, color-mix(in srgb, var(--gold) 16%, transparent), transparent 50%)",
              background: "var(--sunk)",
            }}
          />
          {[
            { top: "22%", left: "28%", me: true, label: "You" },
            { top: "38%", left: "62%", label: "Priya · Product" },
            { top: "58%", left: "35%", label: "Dev · Design" },
            { top: "68%", left: "70%", label: "Ariel · Eng" },
          ].map((p) => (
            <div
              key={p.label}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ top: p.top, left: p.left }}
            >
              <span className={`pin ${p.me ? "pin-me" : ""}`} style={{ background: p.me ? "var(--brand)" : "var(--gold)" }}>
                {p.label.slice(0, 1)}
              </span>
              <span className="whitespace-nowrap rounded-full bg-[var(--card)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ink-soft)] shadow-sm">
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Set your spot",
            body: "Search a neighbourhood or city — we never need your exact address, just somewhere nearby to center the map on.",
          },
          {
            title: "Filter by distance",
            body: "5 to 100 km. See who's actually close enough to grab coffee with, not just anyone with a profile.",
          },
          {
            title: "Say hello, properly",
            body: "Send a connection request. Once it's accepted, you message each other directly — no cold-DM pile-up.",
          },
        ].map((f, i) => (
          <div key={f.title} className="card p-6">
            <span
              className="mb-4 grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
            >
              {i + 1}
            </span>
            <h3 className="text-[15px] font-semibold">{f.title}</h3>
            <p className="mt-2 text-[13.5px] leading-6 text-[var(--ink-soft)]">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="card flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Off the map whenever you want.</h2>
          <p className="mt-1.5 max-w-lg text-[13.5px] leading-6 text-[var(--ink-soft)]">
            Visibility is one toggle in your profile. Turn it off and no one sees you on the
            map — your account, requests, and messages all still work exactly the same.
          </p>
        </div>
        <Link href="/login" className="btn btn-primary shrink-0">
          Create your profile
        </Link>
      </section>
    </div>
  );
}
