/** Only images we stored ourselves (local uploads or the configured bucket). */
export function allowedImage(url: string) {
  if (url.startsWith("/uploads/")) return /^\/uploads\/[a-z0-9/._-]+$/i.test(url) && !url.includes("..");
  const pub = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  return !!pub && url.startsWith(`${pub}/`) && !/\s/.test(url);
}
