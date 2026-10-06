/**
 * Saves a PNG QR code for an ig.me link, for packaging, posters and in-store signs.
 * `qrcode` is imported on click so the library stays out of the page's bundle.
 */
export async function downloadIgMeQr(link: string, name: string) {
  const { default: QRCode } = await import("qrcode");
  const dataUrl = await QRCode.toDataURL(link, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = `ig-me-${name.replace(/[^A-Za-z0-9_=-]+/g, "-") || "link"}.png`;
  anchor.click();
}
