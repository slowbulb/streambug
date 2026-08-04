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
// boosted to reach it. -14 LUFS matches what streaming services (Spotify
// etc.) normalize to — loud enough to sound consistent without needing so
// much gain on quiet tracks that peaks get pushed into clipping. The cap
// is a second line of defense for anything unusually quiet; the limiter
// below (on the output) is the real safety net against clipping.
const NORMALIZE_TARGET_LUFS = -14;
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
  // Two separate elements, only one "live" at a time (picked by `normalize`):
  // rawAudioRef never touches the Web Audio API, so default playback is
  // *guaranteed* bit-for-bit untouched. processedAudioRef is the only one
  // ever routed through Web Audio (for the gain + limiter normalization
  // needs), permanently, from the moment normalize is first switched on —
  // that routing can't be undone on a given element, which is exactly why
  // it's kept off the raw one entirely rather than shared.
  const rawAudioRef = useRef<HTMLAudioElement>(null);
  const processedAudioRef = useRef<HTMLAudioElement>(null);
  // Carries position/play-state across a src swap — switching versions,
  // or switching which of the two elements above is live — so that feels
  // like changing "take" rather than restarting.
  const resumeRef = useRef<ResumePoint | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const limiterNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [state, setState] = useState<PlayerState>(initialState);
  const [normalize, setNormalize] = useState(false);
  const [normalizeError, setNormalizeError] = useState<string | null>(null);
  // Lets event handlers (wired up once) know which element is *currently*
  // live without re-subscribing every time normalize toggles.
  const normalizeRef = useRef(normalize);
  useEffect(() => {
    normalizeRef.current = normalize;
  }, [normalize]);

  const activeVersion =
    state.track?.versions.find((v) => v.id === state.activeVersionId) ?? null;
  const liveAudioRef = normalize ? processedAudioRef : rawAudioRef;

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

  const switchVersion = useCallback(
    (versionId: string) => {
      const audio = liveAudioRef.current;
      setState((s) => {
        if (!audio || s.activeVersionId === versionId) return s;
        resumeRef.current = { time: audio.currentTime, playing: !audio.paused };
        return { ...s, activeVersionId: versionId, isLoading: true };
      });
    },
    [liveAudioRef],
  );

  const togglePlay = useCallback(() => {
    const audio = liveAudioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [liveAudioRef]);

  const seek = useCallback(
    (seconds: number) => {
      const audio = liveAudioRef.current;
      if (!audio) return;
      audio.currentTime = seconds;
      setState((s) => ({ ...s, currentTime: seconds }));
    },
    [liveAudioRef],
  );

  const ensureAudioGraph = useCallback(() => {
    const audio = processedAudioRef.current;
    if (!audio || sourceNodeRef.current) return;
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    // Safety net against clipping: normalization boosts quiet tracks based
    // on their *average* loudness, but a boosted transient peak can still
    // exceed 0dBFS even with a sensible target. This limits the output
    // rather than letting it clip outright. Not a true sample-accurate
    // brickwall limiter (Web Audio doesn't offer one without a custom
    // AudioWorklet), but a fast/hard compressor gets close enough in
    // practice.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    source.connect(gain).connect(limiter).connect(ctx.destination);
    audioCtxRef.current = ctx;
    gainNodeRef.current = gain;
    limiterNodeRef.current = limiter;
    sourceNodeRef.current = source;
  }, []);

  // Hand off from whichever element is live to the other one. The src-load
  // effect below (keyed on `normalize`) actually loads the new element;
  // this just captures where to resume from and pauses the outgoing one.
  const toggleNormalize = useCallback(() => {
    setNormalize((wasOn) => {
      const turningOn = !wasOn;
      setNormalizeError(null);

      const fromAudio = wasOn ? processedAudioRef.current : rawAudioRef.current;
      if (fromAudio) {
        resumeRef.current = { time: fromAudio.currentTime, playing: !fromAudio.paused };
        fromAudio.pause();
      }
      if (turningOn) ensureAudioGraph();
      audioCtxRef.current?.resume();

      return turningOn;
    });
  }, [ensureAudioGraph]);

  // Load the active version into whichever element is currently live —
  // reruns on a version change, and also whenever `normalize` flips (which
  // is exactly when "currently live" changes to the other element).
  useEffect(() => {
    const audio = liveAudioRef.current;
    if (!audio || !activeVersion) return;
    audio.src = activeVersion.audioUrl;
    audio.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVersion?.audioUrl, normalize, liveAudioRef]);

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

  // Wire up both elements' events with the same logic; whichever one isn't
  // currently "live" just sits idle so its events are inert in practice,
  // but we still guard on liveness to be explicit about intent.
  useEffect(() => {
    const isLive = (audio: HTMLAudioElement) =>
      audio === (normalizeRef.current ? processedAudioRef.current : rawAudioRef.current);

    function wire(audio: HTMLAudioElement | null, isProcessed: boolean) {
      if (!audio) return () => {};

      const onLoadedMetadata = () => {
        if (!isLive(audio)) return;
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
      const onTimeUpdate = () => {
        if (isLive(audio)) setState((s) => ({ ...s, currentTime: audio.currentTime }));
      };
      const onPlay = () => {
        if (isLive(audio)) setState((s) => ({ ...s, isPlaying: true }));
      };
      const onPause = () => {
        if (isLive(audio)) setState((s) => ({ ...s, isPlaying: false }));
      };
      const onWaiting = () => {
        if (isLive(audio)) setState((s) => ({ ...s, isLoading: true }));
      };
      const onPlaying = () => {
        if (isLive(audio)) setState((s) => ({ ...s, isLoading: false }));
      };
      // The processed element is the only one ever fetched in CORS mode; if
      // that fails (the storage host doesn't send permissive CORS headers),
      // fall back to the raw element rather than leaving playback silently
      // broken.
      const onError = () => {
        if (!isProcessed || !isLive(audio)) return;
        setNormalize(false);
        setNormalizeError("Volume normalization isn't supported for this track's storage.");
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
    }

    const cleanupRaw = wire(rawAudioRef.current, false);
    const cleanupProcessed = wire(processedAudioRef.current, true);
    return () => {
      cleanupRaw();
      cleanupProcessed();
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
      <audio ref={rawAudioRef} preload="auto" />
      <audio ref={processedAudioRef} preload="none" crossOrigin="anonymous" />
    </PlayerContext.Provider>
  );
}
