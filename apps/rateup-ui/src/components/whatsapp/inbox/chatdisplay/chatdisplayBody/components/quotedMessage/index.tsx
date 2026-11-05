import { useTranslation } from "react-i18next";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { getMessagePreview } from "@/utils/whatsapp/inbox.ts";

interface Props {
  /** The quoted message, when it is among the loaded messages. */
  quoted?: WaGetMessagesBody;
  /** Who wrote the quoted message. */
  author?: string | null;
}

/** The message an inline reply quotes, drawn above the reply. */
export default function QuotedMessage({ quoted, author }: Readonly<Props>) {
  const { t: translations } = useTranslation();
  return (
    <div className="mb-1.5 flex flex-col gap-0.5 rounded-md border-l-2 border-primary bg-muted px-2 py-1 text-xs">
      {quoted ? (
        <>
          {author ? <span className="font-medium text-foreground">{author}</span> : null}
          <span className="line-clamp-2 text-muted-foreground">
            {quoted.deletedAt
              ? translations("This message was deleted")
              : getMessagePreview(quoted)}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground italic">
          {translations("Original message not loaded")}
        </span>
      )}
    </div>
  );
}
