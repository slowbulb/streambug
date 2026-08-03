export function formatLufs(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)} LUFS`;
}

export function formatVersionLabel(version: { versionNumber: number; label: string | null }): string {
  return version.label ? `V${version.versionNumber} — ${version.label}` : `V${version.versionNumber}`;
}

// Derives a reasonable track title from an uploaded file's name:
// strips the extension and replaces separator characters with spaces.
export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^./\\]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}
