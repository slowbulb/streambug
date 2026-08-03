// @audio/loudness-lufs ships an `index.d.ts` but its package.json `exports`
// map doesn't expose a `types` condition, so bundler-mode module resolution
// can't find it. Declared manually here instead of patching node_modules.
declare module "@audio/loudness-lufs" {
  export interface LufsOptions {
    /** sample rate, Hz, default 48000 */
    fs?: number;
    /** per-channel gain array, BS.1770-4 Table 1 (default 1.0 per channel) */
    weights?: number[];
  }

  /**
   * @param channels mono buffer or array of channel buffers
   * @returns integrated LUFS, or null for silence / fully-gated input
   */
  export default function lufs(
    channels: Float32Array | Float32Array[],
    options?: LufsOptions,
  ): number | null;
}
