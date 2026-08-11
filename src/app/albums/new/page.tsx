import { redirect } from "next/navigation";
import { AlbumForm } from "@/components/upload/AlbumForm";
import { isOwnerSession } from "@/lib/auth";
import { isBlobStorageEnabled } from "@/lib/storage";

export default async function NewAlbumPage() {
  if (!(await isOwnerSession())) redirect("/login?redirectTo=%2Falbums%2Fnew");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">New album</h1>
      <AlbumForm hasBlob={isBlobStorageEnabled()} />
    </div>
  );
}
