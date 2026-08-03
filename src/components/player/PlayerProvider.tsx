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

// Loudness normalization target and how far we'll let a single track be
// boosted to reach it. Real music sits well below -2 LUFS, so quiet tracks
// often ask for a large boost; capping it keeps normalization from pushing
// already-dynamic material into audible clipping.
const NORMALIZE_TARGET_LUFS = -2;
const MAX_GAIN_ADJUST_DB = 12;

type PlayerContextValue = PlayerState & {
  activeVersion: PlayerVersion | null;
  playTrack: (track: PlayerTrack, versionId?: string) => void;
  switchVersion: (versionId: string) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  normalize: boolean;
  toggleNormalize: () => void;
  normalizeError: string | null;
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
  // feels like changing "take" rather than starting a new song. Also reused
  // when we reload the current track to enable CORS for normalization.
  const resumeRef = useRef<ResumePoint | null>(null);

  // Loudness normalization runs through the Web Audio API (needed to boost
  // quiet tracks — HTMLMediaElement.volume can only attenuate, never exceed
  // 100%). Routing the element through Web Audio requires the resource to
  // be fetched in CORS mode, so this is all set up lazily, only the first
  // time normalize is switched on, so default playback is never at risk of
  // this — see toggleNormalize.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const corsEnabledRef = useRef(false);
  const awaitingCorsReloadRef = useRef(false);

  const [state, setState] = useState<PlayerState>(initialState);
  const [normalize, setNormalize] = useState(false);
  const [normalizeError, setNormalizeError] = useState<string | null>(null);

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

  const ensureAudioGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || sourceNodeRef.current) return;
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    source.connect(gain).connect(ctx.destination);
    audioCtxRef.current = ctx;
    gainNodeRef.current = gain;
    sourceNodeRef.current = source;
  }, []);

  const toggleNormalize = useCallback(() => {
    setNormalize((wasOn) => {
      const turningOn = !wasOn;
      setNormalizeError(null);

      if (turningOn) {
        ensureAudioGraph();
        audioCtxRef.current?.resume();

        // First activation: the element needs to be reloaded in CORS mode
        // for Web Audio gain to actually affect cross-origin (Blob) audio.
        const audio = audioRef.current;
        if (audio && !corsEnabledRef.current) {
          corsEnabledRef.current = true;
          resumeRef.current = { time: audio.currentTime, playing: !audio.paused };
          awaitingCorsReloadRef.current = true;
          audio.crossOrigin = "anonymous";
          audio.load();
        }
      }

      return turningOn;
    });
  }, [ensureAudioGraph]);

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

  // Keep the normalization gain in sync with the toggle and whichever
  // version is currently playing (different versions can have different
  // measured loudness).
  useEffect(() => {
    const gain = gainNodeRef.current;
    if (!gain) return;
    if (normalize && activeVersion?.lufs != null) {
      const deltaDb = Math.max(
        -MAX_GAIN_ADJUST_DB,
        Math.min(MAX_GAIN_ADJUST_DB, NORMALIZE_TARGET_LUFS - activeVersion.lufs),
      );
      gain.gain.value = 10 ** (deltaDb / 20);
    } else {
      gain.gain.value = 1;
    }
  }, [normalize, activeVersion?.lufs]);

  // Wire up the audio element's events once; the loadedmetadata handler
  // reads resumeRef fresh each time so it always has the latest resume point.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      awaitingCorsReloadRef.current = false;
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
    // If the CORS-mode reload (triggered by turning normalization on)
    // fails — the storage host doesn't send permissive CORS headers — fall
    // back to plain playback rather than leaving the track silently broken.
    const onError = () => {
      if (!awaitingCorsReloadRef.current) return;
      awaitingCorsReloadRef.current = false;
      corsEnabledRef.current = false;
      audio.crossOrigin = null;
      setNormalize(false);
      setNormalizeError("Volume normalization isn't supported for this track's storage.");
      audio.load();
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
    };
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        activeVersion,
        playTrack,
        switchVersion,
        togglePlay,
        seek,
        normalize,
        toggleNormalize,
        normalizeError,
      }}
    >
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  );
}
