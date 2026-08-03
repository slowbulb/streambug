"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { PlayerTrack, PlayerVersion } from "@/lib/playerTypes";

type PlayerState = {
  track: PlayerTrack | null;
  activeVersionId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
};

type ResumePoint = { time: number; playing: boolean };

type PlayerContextValue = PlayerState & {
  activeVersion: PlayerVersion | null;
  playTrack: (track: PlayerTrack, versionId?: string) => void;
  switchVersion: (versionId: string) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}

const initialState: PlayerState = {
  track: null,
  activeVersionId: null,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  // When switching versions of the same track mid-playback, this carries
  // the position (and play/pause state) across the src swap so switching
  // feels like changing "take" rather than starting a new song.
  const resumeRef = useRef<ResumePoint | null>(null);

  const [state, setState] = useState<PlayerState>(initialState);

  const activeVersion =
    state.track?.versions.find((v) => v.id === state.activeVersionId) ?? null;

  const playTrack = useCallback((track: PlayerTrack, versionId?: string) => {
    const version =
      track.versions.find((v) => v.id === versionId) ??
      track.versions.find((v) => v.isDefault) ??
      track.versions[0];
    if (!version) return;

    resumeRef.current = null;
    setState({
      track,
      activeVersionId: version.id,
      isPlaying: true,
      isLoading: true,
      currentTime: 0,
      duration: 0,
    });
  }, []);

  const switchVersion = useCallback((versionId: string) => {
    const audio = audioRef.current;
    setState((s) => {
      if (!audio || s.activeVersionId === versionId) return s;
      resumeRef.current = { time: audio.currentTime, playing: !audio.paused };
      return { ...s, activeVersionId: versionId, isLoading: true };
    });
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setState((s) => ({ ...s, currentTime: seconds }));
  }, []);

  // Swap the audio source whenever the active version changes. Deliberately
  // depends on just the URL, not the whole (freshly-derived-every-render)
  // activeVersion object, so this doesn't reload the audio on unrelated
  // state updates (e.g. timeupdate).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeVersion) return;
    audio.src = activeVersion.audioUrl;
    audio.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVersion?.audioUrl]);

  // Wire up the audio element's events once; the loadedmetadata handler
  // reads resumeRef fresh each time so it always has the latest resume point.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      const resume = resumeRef.current;
      let shouldPlay = true;
      if (resume) {
        audio.currentTime = Math.min(resume.time, audio.duration || resume.time);
        shouldPlay = resume.playing;
        resumeRef.current = null;
      }
      setState((s) => ({ ...s, duration: audio.duration || 0, isLoading: false }));
      if (shouldPlay) audio.play().catch(() => {});
      else audio.pause();
    };
    const onTimeUpdate = () =>
      setState((s) => ({ ...s, currentTime: audio.currentTime }));
    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onWaiting = () => setState((s) => ({ ...s, isLoading: true }));
    const onPlaying = () => setState((s) => ({ ...s, isLoading: false }));

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
    };
  }, []);

  return (
    <PlayerContext.Provider
      value={{ ...state, activeVersion, playTrack, switchVersion, togglePlay, seek }}
    >
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  );
}
