import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AlbumForm } from "@/components/upload/AlbumForm";
import { isOwnerSession } from "@/lib/auth";
import { isBlobStorageEnabled } from "@/lib/storage";

export default async function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isOwnerSession())) redirect(`/login?redirectTo=${encodeURIComponent(`/albums/${id}/edit`)}`);
  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) notFound();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Edit album</h1>
      <AlbumForm album={album} hasBlob={isBlobStorageEnabled()} />
    </div>
  );
}
