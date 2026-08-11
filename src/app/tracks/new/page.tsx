import { redirect } from "next/navigation";
import { NewTrackForm } from "@/components/upload/NewTrackForm";
import { isOwnerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isBlobStorageEnabled } from "@/lib/storage";

export default async function NewTrackPage({
  searchParams,
}: {
  searchParams: Promise<{ albumId?: string }>;
}) {
  if (!(await isOwnerSession())) redirect("/login?redirectTo=%2Ftracks%2Fnew");
  const { albumId } = await searchParams;
  const albums = await prisma.album.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Upload a track</h1>
      <NewTrackForm albums={albums} defaultAlbumId={albumId} hasBlob={isBlobStorageEnabled()} />
    </div>
  );
}
