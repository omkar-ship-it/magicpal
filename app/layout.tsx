import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import NavAuth from "@/components/NavAuth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MagicPal — find your people, nearby",
  description:
    "A map of professionals around you. See who's close, say hello, and build the circle that gets you further.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={inter.variable}>
      <body>
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
        <main className="mx-auto min-h-[calc(100vh-57px)] max-w-6xl px-5 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
