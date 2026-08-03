import Link from "next/link";
import { notFound } from "next/navigation";
import {
  clearLyricsAction,
  deleteTrackAction,
  deleteVersionAction,
  saveLyricsAction,
  setDefaultVersionAction,
} from "@/app/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { SubmitButton } from "@/components/SubmitButton";
import { AddVersionForm } from "@/components/upload/AddVersionForm";
import { TrackPlayPanel } from "@/components/player/TrackPlayPanel";
import { formatBytes } from "@/lib/formatBytes";
import { formatTime } from "@/lib/formatTime";
import { toLrc } from "@/lib/lrc";
import { getTrackForPlayer, toPlayerTrack } from "@/lib/queries";
import { isBlobStorageEnabled } from "@/lib/storage";

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = await getTrackForPlayer(id);
  if (!track) notFound();

  const playerTrack = toPlayerTrack(track);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        {track.album && (
          <Link href={`/albums/${track.album.id}`} className="text-sm text-accent hover:underline">
            ← {track.album.title}
          </Link>
        )}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{track.title}</h1>
          <Link
            href={`/tracks/${track.id}/edit`}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
          >
            Edit
          </Link>
        </div>
      </div>

      <TrackPlayPanel track={playerTrack} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted">Versions</h2>
        <div className="flex flex-col gap-3">
          {track.versions.map((version) => (
            <details key={version.id} className="rounded-lg border border-border bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span className="text-sm font-medium">{version.label}</span>
                {version.isDefault && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                    Default
                  </span>
                )}
                <span className="text-xs text-muted">
                  {version.durationSec ? formatTime(version.durationSec) : "—"} ·{" "}
                  {formatBytes(version.fileSize)}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {!version.isDefault && (
                    <form action={setDefaultVersionAction.bind(null, track.id, version.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-background"
                      >
                        Make default
                      </button>
                    </form>
                  )}
                  {track.versions.length > 1 && (
                    <DeleteButton
                      action={deleteVersionAction.bind(null, track.id, version.id)}
                      confirmMessage={`Delete the "${version.label}" version? This can't be undone.`}
                      label="Delete"
                    />
                  )}
                </span>
              </summary>

              <div className="border-t border-border px-4 py-3">
                <LyricsEditor
                  trackId={track.id}
                  versionId={version.id}
                  initialText={toLrc(version.lyrics)}
                  hasLyrics={version.lyrics.length > 0}
                />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted">Add a version</h2>
        <AddVersionForm trackId={track.id} hasBlob={isBlobStorageEnabled()} />
      </section>

      <DeleteButton
        action={deleteTrackAction.bind(null, track.id)}
        confirmMessage={`Delete "${track.title}" and all its versions? This can't be undone.`}
        label="Delete track"
        className="self-start"
      />
    </div>
  );
}

function LyricsEditor({
  trackId,
  versionId,
  initialText,
  hasLyrics,
}: {
  trackId: string;
  versionId: string;
  initialText: string;
  hasLyrics: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <form action={saveLyricsAction.bind(null, trackId, versionId)} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Synced lyrics (LRC format — one line per timestamp, e.g. [00:12.34] first line)
          <textarea
            name="lrcText"
            rows={6}
            defaultValue={initialText}
            placeholder={"[00:00.00] (intro)\n[00:12.34] First line of the song\n[00:16.10] Second line"}
            className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <div className="flex gap-2">
          <SubmitButton pendingLabel="Saving…" className="px-3 py-1.5">
            Save lyrics
          </SubmitButton>
          {hasLyrics && (
            <DeleteButton
              action={clearLyricsAction.bind(null, trackId, versionId)}
              confirmMessage="Clear synced lyrics for this version?"
              label="Clear"
            />
          )}
        </div>
      </form>
    </div>
  );
}
