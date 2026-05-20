import { Button, Group, Image, Text } from "@mantine/core";
import { IconCircleDashedCheck } from "@tabler/icons-react";
import { CornerUpLeft, ExternalLink, List } from "lucide-react";

import type { WaSendMessageBody } from "@/types/global";
import { whatsappToHTML } from "@/components/RichTextEditor/waTextEditor.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";

import classes from "./styles.module.css";

interface Props {
  interactiveBody: WaSendMessageBody["interactive"];
  messageContent: string;
}
export default function WaInboxInteractiveComponents(props: Readonly<Props>) {
  return (
    <>
      {props?.messageContent && (
        <Group gap={"xs"}>
          <IconCircleDashedCheck
            size={15}
            color="var(--mantine-primary-color-9"
          />
          <Text className={classes.responded_text}>
            {`${props.messageContent} responded`}
          </Text>
        </Group>
      )}
      {props?.interactiveBody?.header && (
        <WaInboxInteractiveHeader interactiveBody={props?.interactiveBody} />
      )}
      {props?.interactiveBody?.body && (
        <Text
          className={classes.body_text}
          dangerouslySetInnerHTML={{
            __html: whatsappToHTML(props?.interactiveBody?.body?.text),
          }}
        />
      )}
      {props?.interactiveBody?.footer && (
        <Text
          className={classes.footer_text}
          dangerouslySetInnerHTML={{
            __html: whatsappToHTML(props?.interactiveBody?.footer?.text),
          }}
        />
      )}
      {props?.interactiveBody?.action?.buttons?.map((button) => (
        <Button
          key={button?.reply?.id}
          leftSection={<CornerUpLeft size={16} />}
          variant="light"
        >
          {button?.reply?.title || button?.reply?.id}
        </Button>
      ))}

      {props?.interactiveBody?.action?.parameters?.flow_cta && (
        <Button variant="light">
          {props?.interactiveBody?.action?.parameters?.flow_cta}
        </Button>
      )}
      {props?.interactiveBody?.action?.name === "cta_url" && (
        <Button
          variant="light"
          component="a"
          href={props?.interactiveBody?.action?.parameters?.url}
          target="_blank"
          rel="noopener noreferrer"
          leftSection={<ExternalLink size={16} />}
        >
          {props?.interactiveBody?.action?.parameters?.display_text}
        </Button>
      )}
      {props?.interactiveBody?.action?.button && (
        <Popover>
          <PopoverTrigger
            disabled={!props?.interactiveBody?.action?.sections?.length}
          >
            <Button
              key={props?.interactiveBody?.action?.button}
              fullWidth
              variant="light"
            >
              <List className="w-5 h-5 mr-1" />
              {props?.interactiveBody?.action?.button}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col gap-1">
              <ScrollArea className="p-2 h-80">
                {props?.interactiveBody?.action?.sections?.map((section) => (
                  <div className="flex flex-col gap-2" key={section.title}>
                    <p className="text-muted-foreground font-semibold text-sm">
                      {section.title}
                    </p>
                    <Separator />
                    {section?.rows?.map((r) => (
                      <div key={r.id} className="flex flex-col gap-1">
                        <div>
                          <p className="text-sm">{r.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {r.description}
                          </p>
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
        <Text className={classes.header_text}>
          {props?.interactiveBody?.header?.text}
        </Text>
      );
    case "image":
      return (
        <Image src={props?.interactiveBody?.header?.image?.link} mah={300} />
      );
  }
};
