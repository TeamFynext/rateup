import type { WaSendMessageBody } from "@/types/global";

import WaInboxInteractiveComponents from "./components/index.tsx";

interface Props {
  interactiveBody: WaSendMessageBody["interactive"];
  messageContent: string;
}
export default function WaInboxInteractive(props: Props) {
  return (
    <div className="w-[298px] flex flex-col gap-2">
      <WaInboxInteractiveComponents
        interactiveBody={props?.interactiveBody}
        messageContent={props?.messageContent}
      />
    </div>
  );
}
