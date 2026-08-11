import { loginAction } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const { error, redirectTo } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-sm text-muted">
        Anyone can browse and play. Signing in as the owner also lets you upload, edit, and
        reorganize.
      </p>
      <form action={loginAction} className="flex flex-col gap-4">
        <input type="hidden" name="redirectTo" value={redirectTo ?? "/"} />
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">Wrong password.</p>}
        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
