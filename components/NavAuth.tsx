import Link from "next/link";
import type { SessionUser } from "@/lib/session";

export default function NavAuth({ user }: { user: SessionUser | null }) {
  if (!user) {
    return (
      <Link href="/login" className="btn btn-primary btn-sm">
        Sign in
      </Link>
    );
  }

  if (!user.onboarded) {
    return (
      <Link href="/#/you" className="btn btn-primary btn-sm">
        Finish your profile
      </Link>
    );
  }

  // Requests, connections, chats and your profile all live on the map now —
  // this header survives only for the two pages that aren't the app itself
  // (sign-in and the institution walkthrough), so it links back and no more.
  return (
    <nav className="flex items-center gap-5 text-sm font-medium">
      <Link href="/" className="text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]">
        Map
      </Link>
      <Link href="/institutions" className="text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]">
        For institutions
      </Link>
      <Link href="/#/you" className="flex items-center gap-2">
        <span
          className="avatar h-8 w-8 text-[12px]"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
        >
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoUrl} alt={user.name ?? "You"} />
          ) : (
            (user.name ?? "?").slice(0, 1).toUpperCase()
          )}
        </span>
      </Link>
      <form action="/api/auth/logout" method="POST">
        <button type="submit" className="btn btn-ghost btn-sm">
          Sign out
        </button>
      </form>
    </nav>
  );
}
