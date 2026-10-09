import SpaceViewLoader from "@/components/SpaceViewLoader";

/** What a scanned QR or a link pasted into a group chat opens. */
export default async function SpacePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SpaceViewLoader code={code} />;
}
