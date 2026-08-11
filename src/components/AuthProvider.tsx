"use client";

import { createContext, useContext } from "react";

const IsOwnerContext = createContext(false);

/** Wraps the app with the server-computed owner flag so client components
 * can conditionally show edit/upload/drag affordances without each needing
 * their own prop threaded down from a page. The actual security boundary is
 * requireOwner() in every Server Action — this only controls what's shown. */
export function AuthProvider({
  isOwner,
  children,
}: {
  isOwner: boolean;
  children: React.ReactNode;
}) {
  return <IsOwnerContext.Provider value={isOwner}>{children}</IsOwnerContext.Provider>;
}

export function useIsOwner(): boolean {
  return useContext(IsOwnerContext);
}
