/** An image ready for jsPDF: a PNG data URL and its natural size. */
export interface ReportImage {
  data: string;
  width: number;
  height: number;
}

/**
 * Fetches an image and re-encodes it as PNG, which jsPDF embeds reliably whatever
 * the source format (WebP and SVG logos included). Answers null rather than failing
 * the export: a report without a logo is still a report.
 */
export async function loadReportImage(url: string | undefined, timeoutMs = 5000) {
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let objectUrl: string | undefined;
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    // Drawing from an object URL keeps the canvas same-origin, so it can be read back.
    objectUrl = URL.createObjectURL(await response.blob());
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 256;
    canvas.height = image.naturalHeight || 256;
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {
      data: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    } satisfies ReportImage;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
