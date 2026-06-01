import type { RequestLogger } from "evlog";
import convert from "heic-convert";
import sharp from "sharp";

const MAX_DIMENSION = 1024;

async function heicToJpeg(buffer: Buffer): Promise<Buffer> {
  const output = await convert({ buffer, format: "JPEG", quality: 0.9 });
  return Buffer.from(output);
}

function resizeAndEncode(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * Fetch an image URL, convert HEIC/non-JPEG to JPEG, and resize for the vision API.
 * Returns a base64 data URL safe for OpenAI vision APIs.
 */
export async function normalizeImageUrl(url: string, log?: RequestLogger): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return url;

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "";
  const isHeic = contentType.includes("heic") || contentType.includes("heif");

  let jpeg: Buffer;

  if (isHeic) {
    log?.set({ image: { sourceFormat: "heif", converted: true } });
    const raw = await heicToJpeg(buffer);
    jpeg = await resizeAndEncode(raw);
  } else {
    const meta = await sharp(buffer)
      .metadata()
      .catch(() => null);
    log?.set({ image: { sourceFormat: meta?.format ?? "unknown", converted: true } });
    jpeg = await resizeAndEncode(buffer);
  }

  const base64 = jpeg.toString("base64");
  return `data:image/jpeg;base64,${base64}`;
}
