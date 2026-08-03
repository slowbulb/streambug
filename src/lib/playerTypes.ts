export type PlayerLyricLine = { id: string; timeMs: number; text: string };

export type PlayerVersion = {
  id: string;
  versionNumber: number;
  label: string | null;
  audioUrl: string;
  durationSec: number | null;
  lufs: number | null;
  isDefault: boolean;
  lyrics: PlayerLyricLine[];
};

export type PlayerTrack = {
  id: string;
  title: string;
  albumId: string | null;
  albumTitle: string | null;
  versions: PlayerVersion[];
};
