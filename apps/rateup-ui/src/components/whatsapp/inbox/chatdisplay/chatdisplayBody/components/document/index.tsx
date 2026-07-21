import { IconDownload, IconFileAnalytics } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useGetMediaFile } from "@/backend/whatsapp/inbox/message/wamessage.query";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment.tsx";

interface Props {
  messageContent: string;
}

export default function WaInboxDocument({ messageContent }: Props) {
  const { mutate, isPending } = useGetMediaFile();
  const [documentSrc, setDocumentSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [link, filename, caption] = messageContent.split("_caption_");

  useEffect(() => {
    if (messageContent && messageContent.startsWith("http")) {
      setDocumentSrc(messageContent);
    }
  }, [messageContent]);

  const handleDownload = () => {
    setFailed(false);
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
        setFailed(true);
        toast.error(error?.message || "Failed to download document file", {
          id: "error-document-download",
        });
      },
    });
  };

  // `state` drives the component's own chrome: `processing` shimmers the title
  // while the media is fetched, `error` tints the media slot. That replaces the
  // hand-rolled spinner this renderer used to show.
  const state = isPending ? "processing" : failed ? "error" : "done";

  return (
    // No padding or surface here: the bubble renders `ghost` for documents, so
    // the Attachment is the only card.
    <div className="flex w-full flex-col gap-1">
      <Attachment state={state}>
        <AttachmentMedia variant="icon">
          <IconFileAnalytics />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{filename}</AttachmentTitle>
          {caption && <AttachmentDescription>{caption}</AttachmentDescription>}
        </AttachmentContent>
        {!documentSrc && (
          <AttachmentActions>
            <AttachmentAction
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              disabled={isPending}
              aria-label="Download document"
            >
              <IconDownload />
            </AttachmentAction>
          </AttachmentActions>
        )}
        {/* Covers the whole card, so it is only rendered once the file is
            actually openable — otherwise it would swallow the download click. */}
        {documentSrc && (
          <AttachmentTrigger
            aria-label={`Open ${filename ?? "document"}`}
            onClick={() => window.open(documentSrc, "_blank")}
          />
        )}
      </Attachment>
    </div>
  );
}
