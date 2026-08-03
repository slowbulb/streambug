import { parseBuffer } from "music-metadata";

// Best-effort duration probe. Returns undefined if the format can't be
// parsed instead of failing the whole upload over a cosmetic field.
export async function probeDurationSec(file: File): Promise<number | undefined> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await parseBuffer(buffer, file.type || undefined);
    return metadata.format.duration;
  } catch {
    return undefined;
  }
}
