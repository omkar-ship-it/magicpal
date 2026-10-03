import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getSessionUser } from "@/lib/session";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";
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

/**
 * Deliberately bare — no header, no padded container. The map (app/page.tsx)
 * is a full-bleed app screen with its own floating chrome, not a website
 * page with a map embedded in it; only the secondary screens get the
 * traditional header, via the (app) route group's own layout.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={inter.variable}>
      <body>
        {user?.onboarded && <PresenceHeartbeat />}
        {children}
      </body>
    </html>
  );
}
