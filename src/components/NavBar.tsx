import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b-2 border-foreground bg-surface">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
        <Link href="/" className="text-sm font-bold uppercase tracking-widest">
          ▸▸ Console
        </Link>
        <div className="flex gap-4 text-xs uppercase tracking-wide text-muted">
          <Link href="/albums" className="hover:text-accent">
            Albums
          </Link>
          <Link href="/tracks" className="hover:text-accent">
            All tracks
          </Link>
          <Link href="/map" className="hover:text-accent">
            Map
          </Link>
        </div>
        <Link
          href="/tracks/new"
          className="ml-auto rounded-sm bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-accent-foreground hover:opacity-90"
        >
          Upload
        </Link>
      </nav>
    </header>
  );
}
