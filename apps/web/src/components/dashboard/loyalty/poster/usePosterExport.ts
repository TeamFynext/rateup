import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/** Brand navy modules on white — scannable, and on-brand without being clever. */
const QR_OPTIONS = { width: 768, margin: 1, color: { dark: "#0f2540", light: "#ffffff" } };

/** A6 is the QR card's paper size; the brochure is a touch narrower. */
export const A6_WIDTH_MM = 105;

/**
 * Exports a mounted artboard (poster, brochure) as a PNG, for download or print.
 *
 * Export first tries the board as shown. Remote images (the merchant's logo and hero) only
 * paint onto a canvas if their host allows cross-origin reads; when that fails the caller
 * is told to render an `exportSafe` version and this hook tries once more, so the merchant
 * always leaves with a file.
 */
export function useArtboardExport(boardRef: RefObject<HTMLDivElement | null>) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [exportSafe, setExportSafe] = useState(false);
  const pendingRetry = useRef<((dataUrl: string) => void) | null>(null);

  const render = useCallback(async (): Promise<string> => {
    const node = boardRef.current;
    if (!node) throw new Error("artboard not mounted");
    return toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      fetchRequestInit: { mode: "cors", cache: "no-cache" },
    });
  }, [boardRef]);

  // After a failed export the board re-renders without remote images; this effect fires
  // once that safe version is in the DOM and finishes the export that was waiting.
  useEffect(() => {
    if (!exportSafe || !pendingRetry.current) return;
    const done = pendingRetry.current;
    pendingRetry.current = null;
    render()
      .then((dataUrl) => {
        toast.info(t("Exported without your images — the image host blocks downloads."));
        done(dataUrl);
      })
      .catch(() => toast.error(t("Could not export the design")))
      .finally(() => setExporting(false));
  }, [exportSafe, render, t]);

  const exportPng = useCallback(
    (onReady: (dataUrl: string) => void) => {
      setExporting(true);
      render()
        .then((dataUrl) => {
          onReady(dataUrl);
          setExporting(false);
        })
        .catch(() => {
          if (exportSafe) {
            toast.error(t("Could not export the design"));
            setExporting(false);
            return;
          }
          pendingRetry.current = onReady;
          setExportSafe(true);
        });
    },
    [render, exportSafe, t],
  );

  const download = useCallback(
    (filename: string) =>
      exportPng((dataUrl) => {
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
      }),
    [exportPng],
  );

  const print = useCallback(
    (widthMm: number = A6_WIDTH_MM) =>
      exportPng((dataUrl) => {
        const win = window.open("", "_blank");
        if (!win) {
          toast.error(t("Allow pop-ups to print"));
          return;
        }
        win.document.write(
          `<!doctype html><title>${t("Print")}</title><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${dataUrl}" style="width:${widthMm}mm;height:auto" onload="window.print()"></body>`,
        );
        win.document.close();
      }),
    [exportPng, t],
  );

  return { exporting, exportSafe, download, print };
}

/** The QR poster's export: draws the code for `url`, then exports like any artboard. */
export function usePosterExport(url: string, posterRef: RefObject<HTMLDivElement | null>) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const board = useArtboardExport(posterRef);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toDataURL(url, QR_OPTIONS)
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { qrDataUrl, ...board };
}
