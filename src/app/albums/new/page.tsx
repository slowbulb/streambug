import { AlbumForm } from "@/components/upload/AlbumForm";
import { isBlobStorageEnabled } from "@/lib/storage";

export default function NewAlbumPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">New album</h1>
      <AlbumForm hasBlob={isBlobStorageEnabled()} />
    </div>
  );
}
