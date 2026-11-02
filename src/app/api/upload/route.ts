import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/session";
import { saveImage, UploadError } from "@/server/storage";

// Signed-in users upload images (listing screenshots, avatars, ticket evidence).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const folder = String(form?.get("folder") ?? "misc");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });

  try {
    const url = await saveImage(file, folder);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }
}
