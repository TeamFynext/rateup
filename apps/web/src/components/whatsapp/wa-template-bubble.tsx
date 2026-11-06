import {
  IconArrowBackUp,
  IconCopy,
  IconExternalLink,
  IconFileTypePdf,
  IconListDetails,
  IconMapPin,
  IconPhone,
  IconPhoto,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { WaTail, WaTime } from "@/components/whatsapp/whatsapp-preview-shell.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * A template message as WhatsApp draws it on the customer's phone — the one bubble every
 * device preview uses (template editor, campaign wizard, automation builder).
 *
 * WhatsApp's own colours, not the app palette: this is a picture of another product. Light
 * and dark follow WhatsApp's two themes. What it reproduces, from Meta's template docs and
 * the Android client:
 * - an incoming bubble with the tail top-left, the time bottom-right and no ticks (ticks are
 *   the sender's; the customer sees none);
 * - a text header in bold, the body with WhatsApp's own *bold* _italic_ ~strike~ ```mono```,
 *   the footer small and grey;
 * - buttons as full-width rows under the bubble; with more than three, the first two and
 *   "See all options" (Meta: "If a template has more than three buttons, two buttons will
 *   appear in the delivered message and the remaining buttons will be replaced with a See all
 *   options button").
 * Words wrap at spaces; only an unbreakable run (a long link) breaks mid-word.
 */

export interface WaPreviewHeader {
  /** TEXT, IMAGE, VIDEO, DOCUMENT, LOCATION or NONE, as Meta spells them. */
  format: string;
  text?: string;
  /** An image to show: a URL, or a picked file. */
  media?: string | File | null;
  fileName?: string;
}

export interface WaPreviewButton {
  type?: string;
  text?: string;
  /** OTP buttons only: copy_code, one_tap or zero_tap. */
  otp_type?: string;
}

/** `{{1}}` or `{{name}}` → the sample value, or left as written when there is none. */
export function fillWaPlaceholders(text: string, samples: Record<string, string> = {}): string {
  return text.replace(/{{\s*([\w.]+)\s*}}/g, (match, key: string) => {
    const value = samples[key];
    return value && value.trim() ? value : match;
  });
}

const FORMAT_PATTERN = /```([\s\S]+?)```|\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/;

/** WhatsApp's inline formatting as React nodes. Markers that do not pair stay as text. */
export function formatWaText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest) {
    const match = FORMAT_PATTERN.exec(rest);
    if (!match) {
      nodes.push(rest);
      break;
    }
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    const [, mono, bold, italic, strike] = match;
    if (mono !== undefined) {
      nodes.push(
        <code key={key++} className="font-mono text-[13px]">
          {mono}
        </code>,
      );
    } else if (bold !== undefined) {
      nodes.push(<strong key={key++}>{formatWaText(bold)}</strong>);
    } else if (italic !== undefined) {
      nodes.push(<em key={key++}>{formatWaText(italic)}</em>);
    } else if (strike !== undefined) {
      nodes.push(<del key={key++}>{formatWaText(strike)}</del>);
    }
    rest = rest.slice(match.index + match[0].length);
  }
  return nodes;
}

const BUTTON_ICON: Record<string, typeof IconPhone> = {
  QUICK_REPLY: IconArrowBackUp,
  URL: IconExternalLink,
  PHONE_NUMBER: IconPhone,
  COPY_CODE: IconCopy,
  OTP: IconCopy,
};

/** The label WhatsApp shows on buttons whose text Meta fixes. */
function buttonLabel(button: WaPreviewButton): string {
  if (button.type === "COPY_CODE") return "Copy offer code";
  if (button.type === "OTP") {
    if (button.otp_type === "one_tap" || button.otp_type === "zero_tap") {
      return button.text || "Autofill";
    }
    return "Copy code";
  }
  return button.text || "";
}

/** The rows under the bubble, folded the way WhatsApp folds them. */
export function visibleWaButtons(buttons: readonly WaPreviewButton[]) {
  if (buttons.length <= 3) return { shown: buttons, overflow: false };
  return { shown: buttons.slice(0, 2), overflow: true };
}

function MediaHeader({ header }: Readonly<{ header: WaPreviewHeader }>) {
  const src = useMemo(() => {
    if (header.media instanceof File) return URL.createObjectURL(header.media);
    return typeof header.media === "string" && /^(https?:|blob:|data:)/.test(header.media)
      ? header.media
      : null;
  }, [header.media]);

  switch (header.format) {
    case "IMAGE":
      return src ? (
        <img src={src} alt="" className="aspect-[1.91/1] w-full rounded-md object-cover" />
      ) : (
        <span className="flex aspect-[1.91/1] w-full items-center justify-center rounded-md bg-[#d1d7db] text-[#8696a0] dark:bg-[#2a3942]">
          <IconPhoto className="size-9" aria-hidden />
        </span>
      );
    case "VIDEO":
      return (
        <span className="relative flex aspect-[1.91/1] w-full items-center justify-center rounded-md bg-[#3b4a54]">
          <span className="flex size-11 items-center justify-center rounded-full bg-black/45">
            <IconPlayerPlayFilled className="size-5 text-white" aria-hidden />
          </span>
        </span>
      );
    case "DOCUMENT":
      return (
        <span className="flex items-center gap-2.5 rounded-md bg-[#f5f6f6] px-2.5 py-2.5 dark:bg-[#1d282f]">
          <IconFileTypePdf className="size-8 shrink-0 text-[#e5252a]" aria-hidden />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] text-[#111b21] dark:text-[#e9edef]">
              {header.fileName ||
                (header.media instanceof File ? header.media.name : "") ||
                "Document.pdf"}
            </span>
            <span className="text-[11px] text-[#667781] dark:text-[#8696a0]">PDF</span>
          </span>
        </span>
      );
    case "LOCATION":
      return (
        <span className="flex aspect-[1.91/1] w-full items-center justify-center rounded-md bg-[#dfe8d8] dark:bg-[#24352b]">
          <IconMapPin className="size-8 text-[#e5252a]" aria-hidden />
        </span>
      );
    default:
      return null;
  }
}

export function WaTemplateMessage({
  header,
  body,
  footer,
  buttons = [],
  samples,
  aboveBody,
  time,
  className,
}: Readonly<{
  header?: WaPreviewHeader | null;
  /** Body text with Meta's placeholders; filled from `samples`. */
  body?: string;
  footer?: string | null;
  buttons?: readonly WaPreviewButton[];
  /** Placeholder values, keyed `1`, `2`, … or by name. */
  samples?: Record<string, string>;
  /** Drawn inside the bubble above the header (the order card of order templates). */
  aboveBody?: ReactNode;
  time?: string;
  className?: string;
}>) {
  const clock =
    time ??
    new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase();
  const format = header?.format?.toUpperCase();
  const isMedia = format && format !== "TEXT" && format !== "NONE";
  const headerText =
    format === "TEXT" && header?.text ? fillWaPlaceholders(header.text, samples) : "";
  const bodyText = body ? fillWaPlaceholders(body, samples) : "";
  const { shown, overflow } = visibleWaButtons(buttons.filter((b) => buttonLabel(b)));
  const hasButtons = shown.length > 0 || overflow;

  return (
    <div
      className={cn(
        "relative ml-2 flex w-[85%] max-w-72 flex-col self-start text-[#111b21] dark:text-[#e9edef]",
        "font-sans [overflow-wrap:anywhere]",
        className,
      )}
    >
      <div
        className={cn(
          "relative rounded-lg rounded-tl-none bg-white shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] dark:bg-[#202c33]",
          hasButtons && "rounded-b-none",
        )}
      >
        <WaTail />
        {aboveBody && <div className="px-1 pt-1">{aboveBody}</div>}
        {isMedia && header && (
          <div className="p-0.75 pb-0">
            <MediaHeader header={{ ...header, format }} />
          </div>
        )}
        <div className="relative px-2 pt-1.5 pb-2">
          {headerText && (
            <p className="mb-0.5 text-[14.5px] leading-5 font-semibold whitespace-pre-wrap">
              {headerText}
            </p>
          )}
          {bodyText && (
            <p className="text-[14.2px] leading-4.75 whitespace-pre-wrap">
              {formatWaText(bodyText)}
              {!footer && <WaTime time={clock} />}
            </p>
          )}
          {footer && (
            <p className="mt-1 text-[13px] leading-4 text-[#667781] dark:text-[#8696a0]">
              {footer}
              <WaTime time={clock} />
            </p>
          )}
          {!bodyText && !footer && <WaTime time={clock} />}
        </div>
      </div>
      {hasButtons && (
        <div className="overflow-hidden rounded-b-lg bg-white shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] dark:bg-[#202c33]">
          {shown.map((button, index) => {
            const Icon = BUTTON_ICON[button.type ?? ""];
            return (
              <div
                key={`${button.type}-${index}`}
                className="flex min-h-10 items-center justify-center gap-1.5 border-t border-[#e9edef] px-3 py-2 text-center text-[14px] leading-tight font-medium text-[#027eb5] dark:border-[#2a3942] dark:text-[#53bdeb]"
              >
                {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
                {buttonLabel(button)}
              </div>
            );
          })}
          {overflow && (
            <div className="flex min-h-10 items-center justify-center gap-1.5 border-t border-[#e9edef] px-3 py-2 text-[14px] font-medium text-[#027eb5] dark:border-[#2a3942] dark:text-[#53bdeb]">
              <IconListDetails className="size-4 shrink-0" aria-hidden />
              See all options
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One card of a media carousel, as WhatsApp lays them out side by side. */
export function WaCarouselCard({
  header,
  body,
  buttons = [],
  samples,
}: Readonly<{
  header?: WaPreviewHeader | null;
  body?: string;
  buttons?: readonly WaPreviewButton[];
  samples?: Record<string, string>;
}>) {
  const bodyText = body ? fillWaPlaceholders(body, samples) : "";
  return (
    <div className="flex w-56 shrink-0 flex-col overflow-hidden rounded-lg bg-white text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] [overflow-wrap:anywhere] dark:bg-[#202c33] dark:text-[#e9edef]">
      {header && header.format !== "TEXT" && header.format !== "NONE" && (
        <div className="p-0.75 pb-0">
          <MediaHeader header={header} />
        </div>
      )}
      {bodyText && (
        <p className="px-2 py-1.5 text-[14px] leading-4.75 whitespace-pre-wrap">
          {formatWaText(bodyText)}
        </p>
      )}
      <div className="mt-auto">
        {buttons
          .filter((button) => buttonLabel(button))
          .map((button, index) => {
            const Icon = BUTTON_ICON[button.type ?? ""];
            return (
              <div
                key={index}
                className="flex min-h-10 items-center justify-center gap-1.5 border-t border-[#e9edef] px-3 py-2 text-[14px] font-medium text-[#027eb5] dark:border-[#2a3942] dark:text-[#53bdeb]"
              >
                {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
                {buttonLabel(button)}
              </div>
            );
          })}
      </div>
    </div>
  );
}
