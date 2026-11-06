/**
 * Center-crops an image file to a square and downscales it, so an avatar or logo needs no
 * manual crop step. Anything the browser cannot decode is returned untouched.
 */

/** Canvas can only encode these; anything else is re-encoded as PNG. */
const ENCODABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Where the square sits vertically, as a fraction of the leftover height. Dead centre crops
 * the top off a portrait, where the face sits high; landscape images stay centred.
 */
const PORTRAIT_VERTICAL_BIAS = 0.25;

export async function cropImageToSquare(file: File, size = 512): Promise<File> {
  // SVG is resolution-independent and decodes inconsistently across browsers; leave it.
  if (file.type === "image/svg+xml" || file.type === "application/svg+xml") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const { width, height } = bitmap;
    const edge = Math.min(width, height);
    const sourceX = (width - edge) / 2;
    const sourceY = (height - edge) * (height > width ? PORTRAIT_VERTICAL_BIAS : 0.5);

    // Never upscale: a 200px photo stays 200px rather than being blown up to 512.
    const target = Math.min(size, edge);

    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, sourceX, sourceY, edge, edge, 0, 0, target, target);

    const type = ENCODABLE_TYPES.has(file.type) ? file.type : "image/png";
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, 0.9);
    });

    if (!blob) return file;

    // Keep the extension in step with the encoded type, or the key we upload under
    // claims a format the bytes are not.
    const name =
      type === file.type
        ? file.name
        : `${file.name.replace(/\.[^.]+$/, "")}.${type === "image/png" ? "png" : "jpg"}`;

    return new File([blob], name, { type });
  } finally {
    bitmap.close();
  }
}
