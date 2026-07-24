import type { WaSendMessageBody } from "@/types/global";

import WaInboxInteractiveComponents from "./components/index.tsx";

interface Props {
  interactiveBody: WaSendMessageBody["interactive"];
  messageContent: string;
}
export default function WaInboxInteractive(props: Props) {
  return (
    // Same card width as a template message, and fluid for the same reason.
    <div className="flex w-full max-w-74.5 flex-col gap-2">
      <WaInboxInteractiveComponents
        interactiveBody={props?.interactiveBody}
        messageContent={props?.messageContent}
      />
    </div>
  );
}
