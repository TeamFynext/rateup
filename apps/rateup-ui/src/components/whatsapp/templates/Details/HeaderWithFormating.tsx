import { IconFileText, IconMapPin, IconPhoto, IconVideo } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";

const MediaCardPreview = ({ children }: { children: ReactNode }) => {
  return (
    <span className="flex min-h-20 w-full flex-col items-center justify-center">{children}</span>
  );
};

export function HeaderWithFormatting(text: string | File, type: string) {
  switch (type) {
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT:
      return <p className="text-sm break-all">{typeof text === "string" ? text : text?.name}</p>;
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE:
      return (
        <MediaCardPreview>
          <span className="relative block w-full p-0">
            {text instanceof File ? (
              <img
                src={URL.createObjectURL(text)}
                className="min-h-17.5 w-full"
                alt="image of the template content"
              />
            ) : text?.startsWith("http") ? (
              <img src={text} className="min-h-17.5 w-full" alt="image of the template content" />
            ) : (
              <span className="flex items-center justify-center">
                <IconPhoto size={40} />
              </span>
            )}
          </span>
        </MediaCardPreview>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO:
      return (
        <MediaCardPreview>
          <IconVideo size={40} />
        </MediaCardPreview>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.DOCUMENT:
      return (
        <MediaCardPreview>
          <IconFileText size={40} />
        </MediaCardPreview>
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.LOCATION:
      return (
        <>
          <MediaCardPreview>
            <IconMapPin size={40} />
          </MediaCardPreview>
          <div className="bg-muted">
            <p className="text-[10px]">{"{{Location name}}"}</p>
            <p className="text-[10px]">{"{{Address}}"}</p>
          </div>
        </>
      );
    default:
      break;
  }
}
