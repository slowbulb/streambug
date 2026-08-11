import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { isOwnerSession } from "@/lib/auth";

export async function NavBar() {
  const isOwner = await isOwnerSession();

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
        <div className="ml-auto flex items-center gap-3">
          {isOwner ? (
            <>
              <Link
                href="/tracks/new"
                className="rounded-sm bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-accent-foreground hover:opacity-90"
              >
                Upload
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-xs uppercase tracking-wide text-muted hover:text-accent"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-xs uppercase tracking-wide text-muted hover:text-accent"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
