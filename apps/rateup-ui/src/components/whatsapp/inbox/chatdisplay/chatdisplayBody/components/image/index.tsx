import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

interface Props {
  messageContent: string;
}

export default function WaInboxImage(props: Props) {
  const [link, caption] = props?.messageContent?.split("_caption_") ?? ["", ""];
  const imageUrl = link ? (link.startsWith("http") ? link : `${getFileUrlFromKey(link)}`) : "";
  const [opened, setOpened] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-1 p-0">
        <img
          src={imageUrl}
          alt="chat media image"
          className="max-w-[150px] rounded-md cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setOpened(true)}
        />
        {caption && <p className="text-sm mt-1">{caption}</p>}
      </div>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:text-white">
          <DialogTitle className="sr-only">Expanded image</DialogTitle>
          <img
            src={imageUrl}
            alt="chat media expanded"
            className="w-full h-auto max-h-[85vh] object-contain rounded-md"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
