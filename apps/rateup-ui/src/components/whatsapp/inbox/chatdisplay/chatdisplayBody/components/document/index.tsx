import { IconDownload, IconFileAnalytics } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";
import { Button } from "@/components/ui/button.tsx";

interface Props {
  messageContent: string;
}

export default function WaInboxDocument({ messageContent }: Props) {
  const { mutate, isPending } = useGetMediaFile();
  const [documentSrc, setDocumentSrc] = useState<string | null>(null);
  const [link, filename, caption] = messageContent.split("_caption_");

  useEffect(() => {
    if (messageContent && messageContent.startsWith("http")) {
      setDocumentSrc(messageContent);
    }
  }, [messageContent]);

  const handleDownload = () => {
    mutate(link, {
      onSuccess: (fileData) => {
        const blob = new Blob([fileData]);
        const url = URL.createObjectURL(blob);
        setDocumentSrc(url);

        const dlLink = document.createElement("a");
        dlLink.href = url;
        dlLink.download = filename ?? "document.pdf";
        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);
      },
      onError: (error) => {
        toast.error(error?.message || "Failed to download document file", {
          id: "error-document-download",
        });
      },
    });
  };

  return (
    <div className="flex flex-col items-center pt-2 w-full">
      <div className="flex flex-col gap-1 w-full p-0">
        <PaperLayout
          onClick={() => {
            if (!documentSrc) return;
            window.open(documentSrc, "_blank");
          }}
          style={{ cursor: documentSrc ? "pointer" : "default" }}
          bg={"var(--light-grey-color-6)"}
          shadow="xs"
        >
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <IconFileAnalytics size={20} className="shrink-0 text-slate-500" />
              <span className="text-sm font-medium truncate">{filename}</span>
            </div>
            {!documentSrc && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full shrink-0 hover:bg-muted/40"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                disabled={isPending}
                aria-label="Download Document"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconDownload size={16} />
                )}
              </Button>
            )}
          </div>
        </PaperLayout>
        {caption && <p className="text-xs text-muted-foreground mt-1 px-1">{caption}</p>}
      </div>
    </div>
  );
}
