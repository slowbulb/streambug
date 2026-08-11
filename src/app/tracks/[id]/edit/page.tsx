import { notFound, redirect } from "next/navigation";
import { updateTrackAction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { isOwnerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EditTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isOwnerSession())) redirect(`/login?redirectTo=${encodeURIComponent(`/tracks/${id}/edit`)}`);
  const [track, albums] = await Promise.all([
    prisma.track.findUnique({ where: { id } }),
    prisma.album.findMany({ orderBy: { title: "asc" } }),
  ]);
  if (!track) notFound();

  const updateAction = updateTrackAction.bind(null, track.id);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Edit track</h1>
      <form action={updateAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            name="title"
            required
            defaultValue={track.title}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Album
          <select
            name="albumId"
            defaultValue={track.albumId ?? ""}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">No album (single)</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.title}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton pendingLabel="Saving…" className="self-start">
          Save changes
        </SubmitButton>
      </form>
    </div>
  );
}
