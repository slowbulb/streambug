"use client";

import { useState, useTransition } from "react";
import { probeDurationClient, uploadFileDirect } from "@/lib/clientUpload";

type FileFieldConfig = {
  /** name of the <input type="file"> in the form */
  fieldName: string;
  folder: "audio" | "covers";
  urlField: string;
  keyField: string;
  required?: boolean;
  probeDuration?: boolean;
};

/**
 * Submits a form to a Server Action, uploading its file field directly to
 * Blob storage first (when enabled) so large audio files never pass through
 * the serverless function's request body — see src/lib/clientUpload.ts.
 * When Blob storage isn't configured, the file is left in the FormData as-is
 * and the Server Action saves it to local disk itself.
 */
export function useUploadSubmit(
  action: (formData: FormData) => Promise<void>,
  fileField: FileFieldConfig,
  hasBlob: boolean,
) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (hasBlob) {
      const selected = formData.get(fileField.fieldName);
      const hasFile = selected instanceof File && selected.size > 0;

      if (!hasFile && fileField.required) {
        setError("A file is required");
        return;
      }

      if (hasFile) {
        const file = selected as File;
        formData.delete(fileField.fieldName);
        setIsUploading(true);
        try {
          const stored = await uploadFileDirect(file, fileField.folder);
          formData.set(fileField.urlField, stored.url);
          formData.set(fileField.keyField, stored.key);
          if (fileField.probeDuration) {
            const duration = await probeDurationClient(file);
            if (duration) formData.set("durationSec", String(duration));
          }
        } catch (err) {
          setError(err instanceof Error ? `Upload failed: ${err.message}` : "Upload failed");
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }
    }

    startTransition(async () => {
      await action(formData);
    });
  }

  return { handleSubmit, isUploading, isPending, error };
}
