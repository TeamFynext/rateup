import {
  IconCamera,
  IconCopy,
  IconLink,
  IconMicrophone,
  IconNote,
  IconPhone,
  IconPlus,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { WHATSAPP_BUTTON_TYPE } from "@/utils/constants.ts";

import classes from "./Message.module.css";

export interface ResponseMessageContainerProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  backgroundColor?: string;
}
export function ResponseMessageContainer({
  children,
  style,
  backgroundColor = "#fff",
}: ResponseMessageContainerProps) {
  return (
    <div
      className={`${classes.common} ${classes.response} mx-auto px-2.5 py-1.5`}
      style={
        {
          "--color": backgroundColor,
          ...style,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export interface SentMessageContainerProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  backgroundColor?: string;
}
export function SentMessageContainer({
  children,
  style,
  backgroundColor = "#d9fdd3",
}: SentMessageContainerProps) {
  return (
    <div
      className={`${classes.common} ${classes.sent} mx-auto p-1`}
      style={
        {
          "--color": backgroundColor,
          ...style,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

interface QuickReplyButtonProps {
  text: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  /** One of `WHATSAPP_BUTTON_TYPE`; decides the icon shown beside the label. */
  type?: string;
}
export function QuickReplyButton({ text, style, onClick, type }: QuickReplyButtonProps) {
  return (
    <div
      className="z-1 w-4/5 cursor-pointer rounded-lg bg-white p-1.5"
      style={style}
      onClick={onClick || (() => {})}
    >
      <div className="flex items-center justify-center gap-1.5 text-blue-500">
        {getIcon(type)}
        <p className="break-all">{text}</p>
      </div>
    </div>
  );
}

const getIcon = (type: string | undefined) => {
  switch (type) {
    case WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER:
      return <IconPhone size={14} />;
    case WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE:
      return <IconCopy size={14} />;
    case WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE:
      return <IconLink size={14} />;
    default:
      return <></>;
  }
};

export function SendMessageMock() {
  return (
    // A picture of WhatsApp's compose bar, not a control surface: nothing here is
    // clickable, so a screen reader should walk past the whole thing.
    <div aria-hidden="true" className="flex flex-nowrap gap-0 rounded-b-xl bg-wa-gray p-0.5">
      <div className="mb-4 flex">
        <Button variant="ghost" size="icon-xs" className="text-wa-blue">
          <IconPlus size={15} />
        </Button>
        <div className="relative mt-1">
          <Input readOnly className="h-5 rounded-md pr-7" />
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-1/2 right-0 -translate-y-1/2 text-wa-blue"
          >
            <IconNote size={15} />
          </Button>
        </div>
        <Button aria-label="Take a photo" variant="ghost" size="icon-xs" className="text-wa-blue">
          <IconCamera size={15} />
        </Button>
        <Button
          aria-label="Record a voice note"
          variant="ghost"
          size="icon-xs"
          className="text-wa-blue"
        >
          <IconMicrophone size={15} />
        </Button>
      </div>
    </div>
  );
}

function WaMessageHeader(props: { children?: ReactNode; [key: string]: unknown }) {
  return <p className="font-bold" {...props} />;
}
function WaMessageBody(props: { children?: ReactNode; [key: string]: unknown }) {
  return <p {...props} />;
}
function WaMessageFooter(props: { children?: ReactNode; [key: string]: unknown }) {
  return <p className="text-sm text-muted-foreground" {...props} />;
}

interface WaResponseMessageProps {
  header?: string;
  body: string;
  footer?: string;
  quickReplyButtons?: string[] | Choice[];
  image?: string; // url of image
}
export function WaResponseMessage({
  body,
  header = "",
  footer = "",
  quickReplyButtons = [],
  image,
}: WaResponseMessageProps) {
  if (quickReplyButtons.length > 3) {
    throw new Error(
      "Too many quick reply buttons. WhatsApp only supports up to 3 quick reply buttons.",
    );
  }
  return (
    // TODO: find out why zIndex is needed
    <div className="z-1 flex flex-col gap-0.75 p-0">
      <ResponseMessageContainer>
        <div className="flex flex-col gap-1">
          {image && <img src={image} alt="" className="rounded-md" />}
          {header && <WaMessageHeader>{header}</WaMessageHeader>}
          {body && <WaMessageBody>{body}</WaMessageBody>}
          {footer && <WaMessageFooter>{footer}</WaMessageFooter>}
        </div>
      </ResponseMessageContainer>
      {/* update changes in whatsapp */}
      {quickReplyButtons.map((text, i) => (
        <QuickReplyButton
          key={i}
          text={typeof text === "string" ? text : String((text as { title?: string }).title ?? "")}
        />
      ))}
    </div>
  );
}
