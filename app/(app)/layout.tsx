import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import NavAuth from "@/components/NavAuth";

/** The normal website chrome — header + padded content — for everything that isn't the map itself. */
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--card)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-white"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
            >
              ✦
            </span>
            <span className="text-[15px]">MagicPal</span>
          </Link>
          <NavAuth user={user} />
        </div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-57px)] max-w-6xl px-5 py-8">{children}</main>
    </>
  );
}
