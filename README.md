# Console

A personal audio library and player: upload tracks, organize them into
albums, keep multiple versions of the same track (a studio take, a live
recording, a remix) and switch between them mid-playback without losing your
place, and add time-synced lyrics that highlight and auto-scroll as the track
plays.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **PostgreSQL via Prisma** (7.x, using the `@prisma/adapter-pg` driver adapter)
- **Vercel Blob** for audio/cover file storage in production, with a local-disk
  fallback for development

## Getting started

1. Have a PostgreSQL server reachable and a database created for the app.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install dependencies and apply the schema:

   ```bash
   npm install
   npx prisma migrate dev
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

Without `BLOB_READ_WRITE_TOKEN` set, uploads are written to `public/uploads`
on local disk — fine for development. See "File storage" below before
deploying.

## Deploying (e.g. Vercel)

1. Provision a Postgres database reachable from your deploy platform (Vercel
   Postgres, Neon, Supabase, Railway, etc. — the app connects via
   `@prisma/adapter-pg`, i.e. a plain `postgresql://` connection string).
2. Create a **Vercel Blob** store (Storage tab on your project) and copy its
   read-write token into `BLOB_READ_WRITE_TOKEN`.
3. Set `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` in your platform's
   environment variables (all environments you deploy to).
4. The `build` script runs `prisma migrate deploy` before `next build`, so
   pending migrations are applied automatically on every deploy.

### Supabase specifically

Supabase's "Connect" dialog (project → Connect) gives you two connection
strings — use both:

- **Transaction pooler** (Supavisor, port `6543`) → set as `DATABASE_URL`.
- **Direct connection** (port `5432`, `db.<project-ref>.supabase.co`) → set
  as `DIRECT_URL`. Migrations need this: Prisma's migration engine relies on
  session-scoped advisory locks and prepared statements that transaction-mode
  pooling doesn't support.

`prisma.config.ts` picks `DIRECT_URL` for migrations when it's set, falling
back to `DATABASE_URL` if not (e.g. a single non-pooled Postgres in local dev).

## File storage

Audio and cover uploads go straight from the browser to **Vercel Blob**
(`src/lib/clientUpload.ts` + `src/app/api/upload/route.ts`) whenever
`BLOB_READ_WRITE_TOKEN` is set, bypassing the request-body-size limit that
serverless platforms impose on Server Actions and Route Handlers (around
4.5MB on Vercel) — important since real songs routinely exceed that. Without
the token, uploads fall back to writing directly to `public/uploads` on the
server's local disk via a Server Action, which only works for local
development or a self-hosted Node server with a persistent filesystem —
**not** on Vercel or similar serverless hosts, where that disk is ephemeral
and wiped on every deploy.

## Data model

- `Album` — title, artist, description, cover image, manually orderable
  track list
- `Track` — a title (auto-filled from the uploaded filename, editable),
  optionally in an album, with a `position` for drag-reordering within its
  album
- `TrackVersion` — one uploaded audio file per variant of a track. Versions
  are auto-numbered per track (`versionNumber`, 1/2/3/...) with an optional
  nickname (`label`, e.g. "Studio", "Live"); exactly one is the default that
  plays when the track is opened. `lufs` holds the integrated loudness
  measurement, when available.
- `LyricLine` — time-synced lyric lines per version, parsed from pasted
  LRC-format text (`[mm:ss.xx] line text`)

## Loudness (LUFS)

Every uploaded file gets its integrated loudness measured client-side: the
browser decodes the audio via the Web Audio API and runs a pure-JS ITU-R
BS.1770-4 gated K-weighted measurement (`@audio/loudness-lufs`) over the
decoded samples (`src/lib/clientUpload.ts`). There's no server-side
equivalent that doesn't require shelling out to `ffmpeg`, so this always
happens in the browser regardless of which upload path is used, and is
best-effort — formats the browser can't decode, or effectively-silent audio,
just show no LUFS value rather than failing the upload. It's shown next to
each track in list views and on the track page.

**Normalize** (toggle in the bottom player bar) evens out playback loudness
across tracks by applying a per-track gain adjustment toward -14 LUFS (the
streaming-platform standard, e.g. Spotify) computed from each version's
measured value and capped at ±12dB. A limiter on the output (a Web Audio
`DynamicsCompressorNode` tuned aggressively, engaged only while Normalize is
on) catches transient peaks that boosted-but-still-dynamic material can push
past 0dBFS, which the gain adjustment alone can't prevent since LUFS is an
average, not a peak measurement.

This needs the Web Audio API (`src/components/player/PlayerProvider.tsx`),
which only takes effect for audio fetched in CORS mode. The player actually
holds **two** `<audio>` elements: a raw one used for all normal playback, and
a second one that's the only one ever wired into the Web Audio graph. This is
because `AudioContext.createMediaElementSource()` permanently reroutes an
element's output the first time it's called on it — there's no way to
disconnect it later, so even turning Normalize back off wouldn't restore
that element's default output path. Keeping the two separate means default
playback (Normalize off) never touches Web Audio at all, and can't be
affected by it. Switching the toggle hands off position/play state from
whichever element was live to the other one. If the storage host doesn't
send permissive-enough CORS headers for the processed element to load,
normalization turns itself back off with an inline message rather than
leaving playback silently broken.

## Waveforms and version filenames

Alongside LUFS, each upload also gets a waveform preview computed
client-side (`analyzeAudioClient` in `src/lib/clientUpload.ts`) — the audio
is only decoded once, and both measurements are derived from that same
decoded buffer. The waveform is ~80 amplitude buckets (`TrackVersion.waveformPeaks`,
max absolute sample per bucket, normalized), rendered as a bar chart
(`src/components/Waveform.tsx`) rather than a canvas, since a rough preview
is all that's needed here. It's shown for every version in a track's
expanded version list, for the currently-playing track's row, and in place
of the plain progress bar on the track page and in the bottom player bar —
in all of those it doubles as a click-to-seek control once it's the version
actually playing. Versions uploaded before this existed just have an empty
`waveformPeaks` array and fall back to the plain range input.

Each version also stores the original uploaded filename
(`TrackVersion.originalFilename`), shown as a version's label when no
custom nickname was given (`formatVersionLabel` in `src/lib/formatLufs.ts`)
— useful for telling otherwise-similarly-named versions apart.

## Reordering and merging tracks

- **Merge as a version**: drag one track directly onto another — on an
  album's page or the "All tracks" page — to fold every version of the
  dragged track into the target as new (auto-numbered) versions, carrying
  over their lyrics, then delete the now-empty source track
  (`mergeTrackIntoVersionAction` in `src/app/actions.ts`,
  `src/components/MergeableTrackList.tsx`,
  `src/components/ReorderableTrackList.tsx`). Useful when the same song
  ended up uploaded as two separate tracks by mistake. The underlying audio
  files are reused as-is, not re-uploaded.
- **Reorder within an album**: on an album's page, drag a track into the gap
  between two tracks (or before the first / after the last) instead of onto
  a track — the gap only shows up as its own drop target while a drag is in
  progress, keeping it distinct from a merge — persisted via `Track.position`
  (`moveTrackAction`, `src/components/ReorderableTrackList.tsx`).

The "All tracks" page only supports merging, since there's no per-album
order to reorder within there.

Expand any track row (the "N versions" toggle) to see and play each version
individually without opening the track page.

## Map

`/map` (`src/components/LibraryMap.tsx`) is a whole-library overview: every
album as a node with its tracks branching off in order (numbered, connected
by a tree-style line rather than a literal mind-map canvas — easier to keep
legible and draggable reliably than freeform node positions), singles in
their own cluster, laid out in flowing columns. Drag a track onto an album's
header to move it there (appended at the end); drag it onto another track to
move *and* insert it at that exact position — same gesture whether the
target track is in a different album or the same one, so this single page
covers both moving tracks between albums and reordering them, unlike the
album/all-tracks pages which each do one or the other. Backed by
`moveTrackAction`, which recomputes position for the whole destination album
in one transaction.

## Drag files from your computer to upload

Drag audio files from Finder/Explorer and drop them anywhere on the app
(`src/components/upload/GlobalDropZone.tsx`, mounted in the root layout) to
upload them as new tracks with no form — the title is taken straight from
the filename. Drop while viewing an album's page and the tracks are added to
that album (detected from the URL); anywhere else, they come in as singles.
Dropping several files at once uploads them all. This uses the same
upload/LUFS/duration logic as the regular upload form
(`quickAddTrackAction` in `src/app/actions.ts`), just without a redirect,
since navigating away mid-drop wouldn't make sense for a multi-file drop.

## How version switching works

The player (`src/components/player/PlayerProvider.tsx`) holds a single
`<audio>` element in the root layout, so it keeps playing across page
navigation. Switching versions of the currently-playing track captures the
current position and play/pause state, swaps the audio source, and restores
both once the new file's metadata loads — so switching feels like changing
"take" rather than starting over. It isn't sample-accurate/gapless (that
would need dual-buffering two full audio files at once), but the position
and playback state carry over.

## Synced lyrics

Paste LRC-format lyrics into a version's lyrics editor (on the track page,
under that version). Each `[mm:ss.xx] line` becomes a synced line; the
currently-playing line highlights and auto-scrolls into view as the track
plays (`src/components/player/SyncedLyrics.tsx`). Unsynced/plain-text lyrics
aren't supported — sync is the point of the feature.

## Project structure

- `src/lib/storage.ts` — server-side file storage (local-disk fallback +
  Blob deletion)
- `src/lib/clientUpload.ts` — direct-to-Blob upload from the browser
- `src/app/api/upload/route.ts` — issues client upload tokens for Blob
- `src/lib/queries.ts` — data-fetching shared by pages, shaping Prisma rows
  into the player's `PlayerTrack` type
- `src/app/actions.ts` — Server Actions for every mutation (albums, tracks,
  versions, lyrics)
- `src/components/player/` — the global player (context, bottom bar, synced
  lyrics, per-track play panel)
- `src/app/` — pages: `/` (dashboard), `/albums`, `/albums/[id]`, `/tracks`,
  `/tracks/[id]`, plus `new`/`edit` forms for each
- `prisma/schema.prisma` — data model (`Album`, `Track`, `TrackVersion`,
  `LyricLine`)

## Known gaps

- **No authentication.** Anything uploaded is visible/editable to anyone
  with the deployed URL. This is meant as a personal, presumably
  access-controlled deployment (e.g. behind your host's access controls); add
  auth before putting real content on a public URL.
- LUFS measurement decodes the full file in the browser, which is memory-
  heavy for very long/lossless files on low-end devices; it's best-effort and
  silently skipped if it fails.
