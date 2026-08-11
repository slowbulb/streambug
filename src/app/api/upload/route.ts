import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isOwnerSession } from "@/lib/auth";

// Issues short-lived client tokens so the browser can upload audio/cover
// files directly to Vercel Blob storage, bypassing the ~4.5MB request body
// limit that applies to Server Actions and Route Handlers on Vercel. This is
// the actual write path for uploads (actions.ts only ever sees a URL this
// produced), so it needs its own owner check — Server Action guards alone
// wouldn't stop a direct call here.
export async function POST(request: Request) {
  if (!(await isOwnerSession())) {
    return NextResponse.json({ error: "Sign in required to upload." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["audio/*", "image/*"],
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
