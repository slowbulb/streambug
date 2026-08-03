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

- `Album` — title, description, cover image, manually orderable track list
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
just show no LUFS value rather than failing the upload.

## Reordering and merging tracks

- **Reorder within an album**: on an album's page, drag a track row onto
  another to move it there — persisted via `Track.position`
  (`src/components/ReorderableTrackList.tsx`).
- **Merge as a version**: on the "All tracks" page, drag one track onto
  another to fold every version of the dragged track into the target as new
  (auto-numbered) versions, carrying over their lyrics, then delete the
  now-empty source track (`mergeTrackIntoVersionAction` in
  `src/app/actions.ts`, `src/components/MergeableTrackList.tsx`). Useful when
  the same song ended up uploaded as two separate tracks by mistake. The
  underlying audio files are reused as-is, not re-uploaded.

These are two different pages on purpose — dragging a track means something
different in each place, and splitting them avoids needing to guess which
gesture you meant from where you drop.

Expand any track row (the "N versions" toggle) to see and play each version
individually without opening the track page.

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
