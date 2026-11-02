import { AwsClient } from "aws4fetch";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomCode } from "@/lib/utils";

/*
  Image storage. Production (Railway) should use S3-compatible object storage,
  e.g. Cloudflare R2: set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY and S3_PUBLIC_URL. Without them files go to UPLOAD_DIR
  (default ./uploads) and are served by /uploads/[...path] — fine locally or
  with a Railway volume mounted at that path.
*/

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": { ext: "webp", magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  "image/gif": { ext: "gif", magic: (b) => b.subarray(0, 4).toString() === "GIF8" },
};

export function uploadDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./uploads");
}

function s3() {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_URL) return null;
  return {
    client: new AwsClient({ accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, service: "s3", region: process.env.S3_REGION || "auto" }),
    endpoint: S3_ENDPOINT.replace(/\/$/, ""),
    bucket: S3_BUCKET,
    publicUrl: S3_PUBLIC_URL.replace(/\/$/, ""),
  };
}

export class UploadError extends Error {}

/** Validates and stores an image, returning its public URL. */
export async function saveImage(file: File, folder: string) {
  if (file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Images must be 5 MB or smaller.");
  const type = TYPES[file.type];
  const buf = Buffer.from(await file.arrayBuffer());
  if (!type || !type.magic(buf)) throw new UploadError("Upload a PNG, JPG, WebP or GIF image.");

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "misc";
  const key = `${safeFolder}/${new Date().toISOString().slice(0, 7)}/${randomCode(12).toLowerCase()}.${type.ext}`;

  const remote = s3();
  if (remote) {
    const res = await remote.client.fetch(`${remote.endpoint}/${remote.bucket}/${key}`, {
      method: "PUT",
      body: buf,
      headers: { "Content-Type": file.type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
    if (!res.ok) throw new UploadError(`Storage rejected the upload (${res.status}).`);
    return `${remote.publicUrl}/${key}`;
  }

  const target = path.join(/*turbopackIgnore: true*/ uploadDir(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buf);
  return `/uploads/${key}`;
}

/** Reads a locally stored upload (local-disk mode only). */
export async function readLocalUpload(parts: string[]) {
  const rel = parts.join("/");
  if (rel.includes("..") || !/^[a-z0-9/._-]+$/i.test(rel)) return null;
  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  const mime = Object.entries(TYPES).find(([, t]) => t.ext === ext)?.[0];
  if (!mime) return null;
  try {
    return { body: await readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ uploadDir(), rel)), mime };
  } catch {
    return null;
  }
}
