"use client";

import { upload } from "@vercel/blob/client";
import lufs from "@audio/loudness-lufs";

export async function uploadFileDirect(
  file: File,
  folder: "audio" | "covers",
): Promise<{ url: string; key: string }> {
  const blob = await upload(`${folder}/${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });
  return { url: blob.url, key: blob.pathname };
}

// Best-effort client-side duration probe (used for the direct-to-Blob path,
// where the server never sees the raw file to inspect it).
export function probeDurationClient(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const cleanup = () => URL.revokeObjectURL(url);
    audio.addEventListener("loadedmetadata", () => {
      cleanup();
      resolve(Number.isFinite(audio.duration) ? audio.duration : undefined);
    });
    audio.addEventListener("error", () => {
      cleanup();
      resolve(undefined);
    });
    audio.src = url;
  });
}

const WAVEFORM_BUCKETS = 150;

// Downsamples decoded channel data into a fixed number of 0..1 amplitude
// buckets (max absolute sample per bucket, across all channels, normalized
// against the loudest bucket) for a static waveform preview.
function computeWaveformPeaks(channels: Float32Array[]): number[] {
  const length = channels[0]?.length ?? 0;
  if (length === 0) return [];

  const bucketSize = Math.max(1, Math.floor(length / WAVEFORM_BUCKETS));
  const peaks: number[] = [];
  for (let b = 0; b < WAVEFORM_BUCKETS; b++) {
    const start = b * bucketSize;
    const end = b === WAVEFORM_BUCKETS - 1 ? length : start + bucketSize;
    let max = 0;
    for (let i = start; i < end; i++) {
      for (const channel of channels) {
        const v = Math.abs(channel[i]);
        if (v > max) max = v;
      }
    }
    peaks.push(max);
  }

  const overallMax = Math.max(...peaks, 1e-6);
  return peaks.map((p) => Math.min(1, p / overallMax));
}

export type AudioAnalysis = { lufs?: number; waveformPeaks?: number[] };

// Integrated loudness (LUFS, ITU-R BS.1770-4) and a waveform preview, both
// measured client-side from a single decode of raw audio bytes with the Web
// Audio API — there's no server-side equivalent that doesn't require
// shelling out to ffmpeg, so this always runs client-side. Best-effort:
// returns an empty result for formats the browser can't decode, or
// effectively-silent audio.
async function analyzeArrayBuffer(arrayBuffer: ArrayBuffer): Promise<AudioAnalysis> {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextCtor();
    try {
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, i) =>
        audioBuffer.getChannelData(i),
      );
      const value = lufs(channels, { fs: audioBuffer.sampleRate });
      return {
        lufs: value === null ? undefined : value,
        waveformPeaks: computeWaveformPeaks(channels),
      };
    } finally {
      await audioCtx.close();
    }
  } catch {
    return {};
  }
}

// Used at upload time, when the audio hasn't left the browser yet.
export async function analyzeAudioClient(file: File): Promise<AudioAnalysis> {
  return analyzeArrayBuffer(await file.arrayBuffer());
}

// Used to backfill LUFS/waveform for versions uploaded before either
// existed: fetches the already-stored file and analyzes it the same way.
// Works cross-origin against Vercel Blob's public URLs, which send
// permissive CORS headers (same as the Normalize feature relies on).
export async function analyzeAudioFromUrl(url: string): Promise<AudioAnalysis> {
  const res = await fetch(url);
  if (!res.ok) return {};
  return analyzeArrayBuffer(await res.arrayBuffer());
}
