import { IconCircleDashedCheck } from "@tabler/icons-react";
import { CornerUpLeft, ExternalLink, List } from "lucide-react";

import { whatsappToHTML } from "@/components/RichTextEditor/waTextEditor.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import type { WaSendMessageBody } from "@/types/global";

interface Props {
  interactiveBody: WaSendMessageBody["interactive"];
  messageContent: string;
}
export default function WaInboxInteractiveComponents(props: Readonly<Props>) {
  return (
    <>
      {props?.messageContent && (
        <div className="flex items-center gap-1">
          <IconCircleDashedCheck size={15} className="text-primary" />
          <span className="text-xs font-medium text-primary">{`${props.messageContent} responded`}</span>
        </div>
      )}
      {props?.interactiveBody?.header && (
        <WaInboxInteractiveHeader interactiveBody={props?.interactiveBody} />
      )}
      {props?.interactiveBody?.body && (
        <p
          className="text-sm font-normal text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: whatsappToHTML(props?.interactiveBody?.body?.text),
          }}
        />
      )}
      {props?.interactiveBody?.footer && (
        <p
          className="text-xs font-light text-muted-foreground"
          dangerouslySetInnerHTML={{
            __html: whatsappToHTML(props?.interactiveBody?.footer?.text),
          }}
        />
      )}
      {props?.interactiveBody?.action?.buttons?.map((button) => (
        <Button
          key={button?.reply?.id}
          variant="secondary"
          className="w-full text-xs text-indigo-600 gap-1.5 hover:bg-muted/40"
        >
          <CornerUpLeft size={16} />
          <span>{button?.reply?.title || button?.reply?.id}</span>
        </Button>
      ))}

      {props?.interactiveBody?.action?.parameters?.flow_cta && (
        <Button
          variant="secondary"
          className="w-full text-xs text-indigo-600 gap-1.5 hover:bg-muted/40"
        >
          {props?.interactiveBody?.action?.parameters?.flow_cta}
        </Button>
      )}
      {props?.interactiveBody?.action?.name === "cta_url" && (
        <a
          href={props?.interactiveBody?.action?.parameters?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button
            variant="secondary"
            className="w-full text-xs text-indigo-600 gap-1.5 hover:bg-muted/40"
          >
            <ExternalLink size={16} />
            <span>{props?.interactiveBody?.action?.parameters?.display_text}</span>
          </Button>
        </a>
      )}
      {props?.interactiveBody?.action?.button && (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="secondary"
                className="w-full text-xs text-indigo-600 gap-1.5 hover:bg-muted/40"
                disabled={!props?.interactiveBody?.action?.sections?.length}
              />
            }
          >
            <List className="w-4 h-4" />
            <span>{props?.interactiveBody?.action?.button}</span>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col gap-1">
              <ScrollArea className="p-2 h-80">
                {props?.interactiveBody?.action?.sections?.map((section) => (
                  <div className="flex flex-col gap-2" key={section.title}>
                    <p className="text-muted-foreground font-semibold text-sm">{section.title}</p>
                    <Separator />
                    {section?.rows?.map((r) => (
                      <div key={r.id} className="flex flex-col gap-1">
                        <div>
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </div>
                        <Separator className="my-1" />
                      </div>
                    ))}
                  </div>
                ))}
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
const WaInboxInteractiveHeader = (props: Omit<Props, "messageContent">) => {
  switch (props?.interactiveBody?.header?.type) {
    case "text":
      return (
        <span className="text-md font-semibold text-foreground">
          {props?.interactiveBody?.header?.text}
        </span>
      );
    case "image":
      return (
        <img
          src={props?.interactiveBody?.header?.image?.link}
          className="max-h-[300px] w-full object-cover rounded-md"
          alt="Header interactive image"
        />
      );
    default:
      return null;
  }
};
