import { NewTrackForm } from "@/components/upload/NewTrackForm";
import { prisma } from "@/lib/db";
import { isBlobStorageEnabled } from "@/lib/storage";

export default async function NewTrackPage({
  searchParams,
}: {
  searchParams: Promise<{ albumId?: string }>;
}) {
  const { albumId } = await searchParams;
  const albums = await prisma.album.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Upload a track</h1>
      <NewTrackForm albums={albums} defaultAlbumId={albumId} hasBlob={isBlobStorageEnabled()} />
    </div>
  );
}
