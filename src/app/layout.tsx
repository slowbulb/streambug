import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { NavBar } from "@/components/NavBar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { PlayerBar } from "@/components/player/PlayerBar";
import { GlobalDropZone } from "@/components/upload/GlobalDropZone";
import { VersionDragZone } from "@/components/VersionDragZone";
import { isOwnerSession } from "@/lib/auth";
import { isBlobStorageEnabled } from "@/lib/storage";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Console — your music, everywhere",
  description: "Upload tracks, organize them into albums, and play them back from anywhere.",
};

// Every page reads live data (albums/tracks/lyrics change on every upload,
// edit, or delete) and there's no benefit to prerendering a snapshot of a
// personal library at build time.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isOwner = await isOwnerSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider isOwner={isOwner}>
          <PlayerProvider>
            <NavBar />
            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
              {children}
            </main>
            <PlayerBar />
            <GlobalDropZone hasBlob={isBlobStorageEnabled()} />
            <VersionDragZone />
          </PlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
