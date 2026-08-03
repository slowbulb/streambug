import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b border-border bg-surface">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          🎵 Console
        </Link>
        <div className="flex gap-4 text-sm text-muted">
          <Link href="/albums" className="hover:text-foreground">
            Albums
          </Link>
          <Link href="/tracks" className="hover:text-foreground">
            All tracks
          </Link>
          <Link href="/map" className="hover:text-foreground">
            Map
          </Link>
        </div>
        <Link
          href="/tracks/new"
          className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Upload
        </Link>
      </nav>
    </header>
  );
}
