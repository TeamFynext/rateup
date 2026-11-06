import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { downloadBlob } from "@/utils/downloadBlob.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

interface Props {
  messageContent: string;
}

/** Names the saved file after the stored object, falling back when the key carries no extension. */
function fileNameFor(link: string) {
  const base = link.split("?")[0]?.split("/").pop();
  return base && /\.[a-z0-9]+$/i.test(base) ? base : `whatsapp-image-${Date.now()}.jpg`;
}

export default function WaInboxImage(props: Props) {
  const [link, caption] = props?.messageContent?.split("_caption_") ?? ["", ""];
  const imageUrl = link ? (link.startsWith("http") ? link : `${getFileUrlFromKey(link)}`) : "";
  const [opened, setOpened] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (event: React.MouseEvent) => {
    // The thumbnail's own click opens the lightbox.
    event.stopPropagation();
    if (!imageUrl || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      downloadBlob(await response.blob(), fileNameFor(link));
    } catch {
      // The media sits on the CDN, so the fetch fails outright if it answers without
      // CORS headers, and `download` on a plain anchor is ignored cross-origin — the
      // only fallback that still lets the image be saved is opening it.
      globalThis.open(imageUrl, "_blank", "noopener");
      toast.info("Opened the image in a new tab — use your browser to save it.", {
        id: "wa-image-download-fallback",
      });
    } finally {
      setDownloading(false);
    }
  };

  const downloadIcon = downloading ? <IconLoader2 className="animate-spin" /> : <IconDownload />;

  return (
    <>
      <div className="flex flex-col gap-1 p-0">
        <div className="group relative w-fit">
          <button
            type="button"
            onClick={() => setOpened(true)}
            className="block cursor-pointer rounded-md transition-opacity hover:opacity-90"
          >
            <img src={imageUrl} alt="chat media image" className="max-w-[150px] rounded-md" />
          </button>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            aria-label="Download image"
            title="Download image"
            loading={downloading}
            onClick={handleDownload}
            // Always reachable by keyboard and on touch, where there is no hover.
            className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
          >
            {downloadIcon}
          </Button>
        </div>
        {caption && <p className="text-sm mt-1">{caption}</p>}
      </div>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:text-white">
          <DialogTitle className="sr-only">Expanded image</DialogTitle>
          {/* Wrapped, so the content's `[&>button]:text-white` (aimed at the close
              button) does not bleach this one against its own surface. */}
          <div className="relative">
            <img
              src={imageUrl}
              alt="chat media expanded"
              className="w-full h-auto max-h-[85vh] object-contain rounded-md"
            />
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label="Download image"
              title="Download image"
              disabled={downloading}
              onClick={handleDownload}
              // Clear of the dialog's own close button at top-4 right-4.
              className="absolute top-4 right-14"
            >
              {downloadIcon}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
