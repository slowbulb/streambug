"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-md bg-accent text-accent-foreground font-medium px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity ${className}`}
    >
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}
