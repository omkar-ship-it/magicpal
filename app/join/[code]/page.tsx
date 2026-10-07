import { notFound } from "next/navigation";
import { inviteByCode } from "@/lib/circleData";
import CircleJoin from "@/components/CircleJoin";

/**
 * The link an alumni admin shares. Deliberately outside the (app) group so
 * there's no header, no sign-in wall, and nothing between the link and being
 * in the community.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = inviteByCode(code);
  if (!invite) notFound();
  return <CircleJoin invite={invite} />;
}
