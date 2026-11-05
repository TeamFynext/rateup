import {
  IconArrowBackUp,
  IconCopy,
  IconExternalLink,
  IconFileText,
  IconList,
  IconPhone,
  IconSend2,
} from "@tabler/icons-react";
import type { Edge } from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query.ts";
import { useWaTemplateById } from "@/backend/whatsapp/whatsapp.query.ts";
import { DM, DmComposer, DmHeader } from "@/components/common/dm-preview-shell.tsx";
import type { TiptapNode } from "@/components/RichTextEditor/wa-editor/format.tsx";
import { parseJsonToReact } from "@/components/RichTextEditor/wa-editor/format.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  WA,
  WaDateChip,
  WaWallpaper,
  WhatsAppChatHeader,
  WhatsAppChatInputBar,
} from "@/components/whatsapp/whatsapp-preview-shell.tsx";
import { cn } from "@/lib/utils";
import { WHATSAPP_BUTTON_TYPE } from "@/utils/constants.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import { parseTemplate } from "@/utils/whatsapp/templates.tsx";

import type { NodeFields } from "../types/node-types.ts";
import type { TypedNode } from "../types/node-types.ts";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Internal/operational nodes that don't produce a customer-facing message — the playground
// silently passes through them while walking the flow instead of rendering a chat bubble.
// `ticketNode` is a retired type kept here only so flows saved before ticketing was
// removed still skip past it instead of trying to render it as a chat bubble.
const SILENT_NODE_TYPES = new Set(["assignNode", "ticketNode", "leadgenNode"]);

function isSilentNode(node: TypedNode | null | undefined): boolean {
  return !!node && SILENT_NODE_TYPES.has(node.type);
}

const INPUT_NODE_TYPES = new Set([
  "textInputNode",
  "numberInputNode",
  "emailInputNode",
  "phoneInputNode",
  "dateInputNode",
]);

function isInputNode(node: TypedNode | null | undefined): boolean {
  return !!node && INPUT_NODE_TYPES.has(node.type);
}

function isPauseNode(node: TypedNode | null | undefined): boolean {
  return node?.type === "pauseNode";
}

type MediaInfo =
  | { kind: "image"; src: string; caption?: string }
  | { kind: "video"; src: string; caption?: string }
  | { kind: "audio"; src: string }
  | { kind: "document"; src: string; filename?: string; caption?: string };

function getNodeMedia(node: TypedNode | null | undefined): MediaInfo | null {
  const data: NodeFields | undefined = node?.data;
  if (!data?.link) return null;
  // Same resolution image-node.tsx uses on the canvas: data.link is a stored file key, not a URL.
  const src = getFileUrlFromKey(data.link) || "/placeholder.svg";
  switch (node?.type) {
    case "imageNode":
      return { kind: "image", src, caption: data.caption };
    case "videoNode":
      return { kind: "video", src, caption: data.caption };
    case "audioNode":
      return { kind: "audio", src };
    case "documentNode":
      return { kind: "document", src, filename: data.filename, caption: data.caption };
    default:
      return null;
  }
}

// Real pause durations would be unusable in a live preview, so the wait is clamped to a
// short, perceptible delay instead of literally waiting minutes/hours.
function getPauseDelayMs(node: TypedNode): number {
  const data: NodeFields | undefined = node?.data;
  const duration = Number(data?.duration) || 0;
  const unit = data?.unit ?? "seconds";
  const multiplier = unit === "hours" ? 3600 : unit === "minutes" ? 60 : 1;
  return Math.min(Math.max(duration * multiplier * 1000, 500), 4000);
}

function templateButtonIcon(type: string) {
  switch (type) {
    case WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE:
      return <IconExternalLink className="size-3.5" />;
    case WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER:
      return <IconPhone className="size-3.5" />;
    case WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE:
      return <IconCopy className="size-3.5" />;
    default:
      return <IconArrowBackUp className="size-3.5 -scale-x-100" />;
  }
}

/** Renders a templateNode by fetching the actual referenced WhatsApp template and showing
 * its real header/body/footer/buttons — templateNode itself only stores a template id. */
function TemplateMessageCard({
  templateId,
  at,
}: Readonly<{ templateId: string | undefined; at: number }>) {
  const { t } = useTranslation();
  const { data: rawTemplate, isPending } = useWaTemplateById(templateId ?? "");

  if (!templateId) {
    return (
      <div className="w-[78%] rounded-lg bg-white px-3 py-2 text-[11px] text-muted-foreground shadow-sm dark:bg-[#202c33]">
        {t("No template selected")}
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="w-[78%] rounded-lg bg-white px-3 py-2 text-[11px] text-muted-foreground shadow-sm dark:bg-[#202c33]">
        {t("Loading template…")}
      </div>
    );
  }

  const template = parseTemplate(rawTemplate);
  const headerImage = ["IMAGE", "VIDEO", "DOCUMENT"].includes(template.format)
    ? template.header
    : null;
  const headerText = template.format === "TEXT" ? template.header : null;

  return (
    <div className="w-[78%] overflow-hidden rounded-lg bg-white shadow-sm dark:bg-[#202c33]">
      {headerImage && <img src={headerImage} alt="" className="h-40 w-full object-cover" />}
      {headerText && (
        <div className="px-3 pt-2 text-[12px] font-semibold text-foreground">
          {parseJsonToReact(headerText)}
        </div>
      )}
      <div className="whitespace-pre-wrap px-3 pt-2 text-[11px] text-foreground">
        {template.body || t("(empty message)")}
      </div>
      {template.footer && (
        <div className="px-3 pt-1 text-[10px] text-muted-foreground">{template.footer}</div>
      )}
      <div className="px-3 pb-1.5 pt-1 text-right text-[9px] text-muted-foreground">
        {formatTime(at)}
      </div>
      {(template.buttons ?? []).length > 0 && (
        <div className="border-t border-border">
          {template.buttons.map((btn, i: number) => (
            <div
              key={String(btn.id ?? i)}
              className={cn(
                "text-wa-green flex w-full items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium",
                i > 0 && "border-t border-border",
              )}
            >
              {templateButtonIcon(btn.type ?? "")}
              {btn.text || t("Button")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders a flowNode by fetching the referenced WhatsApp Flow and showing its actual
 * start-message template (header image/text, body, footer, CTA) — flowNode itself only
 * stores a flow id, the message content lives on the flow's templateMessage. */
function FlowMessageCard({ flowId, at }: Readonly<{ flowId: string | undefined; at: number }>) {
  const { t } = useTranslation();
  const { data: dbFlow, isPending } = useWaFlowFromDb(flowId ?? "");

  if (!flowId) {
    return (
      <div className="w-[78%] rounded-lg bg-white px-3 py-2 text-[11px] text-muted-foreground shadow-sm dark:bg-[#202c33]">
        {t("No flow selected")}
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="w-[78%] rounded-lg bg-white px-3 py-2 text-[11px] text-muted-foreground shadow-sm dark:bg-[#202c33]">
        {t("Loading flow…")}
      </div>
    );
  }

  const tm: Partial<WaFlowTemplateMessage> = dbFlow?.templateMessage ?? {};
  const headerImageUrl = tm.headerImage ? getFileUrlFromKey(tm.headerImage) : null;

  return (
    <div className="w-[78%] overflow-hidden rounded-lg bg-white shadow-sm dark:bg-[#202c33]">
      {headerImageUrl && <img src={headerImageUrl} alt="" className="h-40 w-full object-cover" />}
      {tm.header && (
        <div className="px-3 pt-2 text-[12px] font-semibold text-foreground">{tm.header}</div>
      )}
      <div className="whitespace-pre-wrap px-3 pt-2 text-[11px] text-foreground">
        {tm.body || t("(empty message)")}
      </div>
      {tm.footer && <div className="px-3 pt-1 text-[10px] text-muted-foreground">{tm.footer}</div>}
      <div className="px-3 pb-1.5 pt-1 text-right text-[9px] text-muted-foreground">
        {formatTime(at)}
      </div>
      <div className="border-t border-border">
        <div className="flex w-full items-center justify-center py-2.5 text-[12px] font-semibold text-blue-600 dark:text-blue-400">
          {tm.cta || t("Open")}
        </div>
      </div>
    </div>
  );
}

const PREVIEW_HEADERS = {
  whatsapp: WhatsAppChatHeader,
  instagram: () => <DmHeader />,
  facebook: () => <DmHeader />,
};

type PreviewPlatform = keyof typeof PREVIEW_HEADERS;

/**
 * How each app draws a chat. WhatsApp: a beige canvas, white bubbles with the time, buttons
 * inside the bubble. Instagram and Messenger: a plain canvas, grey bubbles, quick replies as
 * chips under the message and the person's own messages in the channel's colour.
 */
const CHAT_LOOK: Record<
  PreviewPlatform,
  {
    channel: string;
    canvas: string;
    bot: string;
    user: string;
    /** Message text size and colour. */
    text: string;
    showTime: boolean;
  }
> = {
  // WhatsApp's own colours (see whatsapp-preview-shell.tsx); its wallpaper is drawn by WaWallpaper.
  whatsapp: {
    channel: "channel-whatsapp",
    canvas: "",
    bot: cn("ml-2 w-[80%] rounded-lg rounded-tl-none", WA.incoming, WA.shadow),
    user: cn("mr-2 rounded-lg rounded-tr-none text-left", WA.outgoing, WA.shadow),
    text: "text-[14.2px] leading-4.75",
    showTime: true,
  },
  // Instagram and Messenger share Instagram's thread (see common/dm-preview-shell.tsx).
  instagram: {
    channel: "channel-instagram",
    canvas: DM.screen,
    bot: cn("w-fit max-w-[78%] rounded-[22px]", DM.incoming),
    user: cn("rounded-[22px] text-left", DM.outgoing),
    text: "text-[14px] leading-5",
    showTime: false,
  },
  facebook: {
    channel: "channel-messenger",
    canvas: DM.screen,
    bot: cn("w-fit max-w-[78%] rounded-[22px]", DM.incoming),
    user: cn("rounded-[22px] text-left", DM.outgoing),
    text: "text-[14px] leading-5",
    showTime: false,
  },
};

interface CardElement {
  title?: string;
  subtitle?: string;
  buttons?: Array<{ id?: string; payload?: string; title?: string; type?: string; url?: string }>;
}

interface NodeOption {
  id: string;
  label: string;
}

// Returns the raw body, which for several node types (text/button/list/cta) is a TipTap
// rich-text JSON object rather than a plain string — must go through parseJsonToReact.
function getNodeBody(node: TypedNode | null | undefined): string | TiptapNode {
  const data: NodeFields | undefined = node?.data;
  if (!data) return "";
  return (
    data.body ||
    data.text ||
    data.startMessage ||
    data.endMessage ||
    data.question ||
    data.label ||
    ""
  );
}

function getNodeOptions(node: TypedNode | null | undefined): NodeOption[] {
  const data: NodeFields | undefined = node?.data;
  if (!data) return [];
  if (Array.isArray(data.buttons) && data.buttons.length > 0) {
    return data.buttons.map((b, i: number) => ({
      id: b.id ?? String(i),
      label: b.title ?? b.text ?? b.label ?? `Option ${i + 1}`,
    }));
  }
  if (Array.isArray(data.sections) && data.sections.length > 0) {
    return data.sections.flatMap((section, sIdx: number) =>
      (section.rows ?? []).map((row, rIdx: number) => ({
        id: row.id ?? `${sIdx}-${rIdx}`,
        label: row.title ?? row.text ?? "",
      })),
    );
  }
  if (Array.isArray(data.quick_replies) && data.quick_replies.length > 0) {
    return data.quick_replies.map((r, i: number) => ({
      id: r.id ?? r.payload ?? `qr_${i}`,
      label: r.title ?? `Option ${i + 1}`,
    }));
  }
  // Cards: only postback buttons answer the bot; link buttons leave the chat. The id
  // fallback mirrors the branch handle node.tsx gives a button saved without one.
  if (Array.isArray(data.elements) && data.elements.length > 0) {
    return data.elements.flatMap((card, cIdx: number) =>
      (card.buttons ?? []).flatMap((b, bIdx: number) =>
        b.type === "postback"
          ? [{ id: b.id ?? b.payload ?? `btn_${cIdx}_${bIdx}`, label: b.title ?? "" }]
          : [],
      ),
    );
  }
  return [];
}

// History only keeps node/option references; body & options text are resolved live from
// the current node map on every render, so editing a node's message updates the preview
// immediately even mid-conversation.
type ChatEntry =
  | { kind: "bot"; nodeId: string; at: number }
  | { kind: "user"; label: string; at: number };

/**
 * Walks the flowbot's node graph starting from the entry node, auto-advancing through
 * linear messages and pausing at the first button/list/input node to wait for the user —
 * exactly how the real conversation would play out for an end user. Pause nodes delay
 * (briefly, for preview purposes) instead of rendering anything; assign/ticket/AI/lead
 * nodes are skipped entirely since they aren't customer-facing messages.
 */
export function FlowbotPreviewPlayground({
  nodes,
  edges,
  platform = "whatsapp",
  context,
  autoStart = false,
}: Readonly<{
  nodes: TypedNode[];
  edges: Edge[];
  platform?: PreviewPlatform;
  /** A line above the first message saying how the chat began, e.g. "Tapped Get Started". */
  context?: string;
  /** Plays the first messages straight away, instead of waiting for Start. */
  autoStart?: boolean;
}>) {
  const { t } = useTranslation();

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const entryNode = useMemo(
    () => nodes.find((n) => n.type === "startNode" || n.type === "leadgenNode") ?? null,
    [nodes],
  );

  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [started, setStarted] = useState(false);
  const [waitingNodeId, setWaitingNodeId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  // Which option was tapped for each button/list node, so the buttons stay visible (with
  // the chosen one grayed out) after the user answers, instead of disappearing.
  const [selections, setSelections] = useState<Record<string, string>>({});
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPendingPause() {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  }

  // Only reset the in-progress simulation when the entry node itself changes (added,
  // removed, or swapped) — not on every node/edge edit, which would wipe the user's
  // progress while they're testing a flow they're actively tweaking.
  useEffect(() => {
    clearPendingPause();
    setStarted(false);
    setWaitingNodeId(null);
    setInputValue("");
    setSelections({});
    setHistory([]);
    if (autoStart && entryNode) {
      setStarted(true);
      advance(entryNode.id);
    }
  }, [entryNode?.id]);

  useEffect(() => clearPendingPause, []);

  function nextNode(nodeId: string, handleId?: string): TypedNode | null {
    const edge =
      handleId !== undefined
        ? edges.find((e) => e.source === nodeId && e.sourceHandle === handleId)
        : edges.find((e) => e.source === nodeId);
    if (!edge) return null;
    return (nodesById.get(edge.target) as TypedNode) ?? null;
  }

  function advance(fromNodeId: string, handleId?: string) {
    clearPendingPause();
    let current = nextNode(fromNodeId, handleId);
    const visited = new Set<string>();

    function walk() {
      const appended: ChatEntry[] = [];

      while (current) {
        if (visited.has(current.id)) {
          current = null;
          break;
        }
        visited.add(current.id);

        if (isSilentNode(current)) {
          current = nextNode(current.id);
          continue;
        }

        if (isPauseNode(current)) {
          const pauseNode = current;
          if (appended.length > 0) setHistory((prev) => [...prev, ...appended]);
          pauseTimeoutRef.current = setTimeout(() => {
            pauseTimeoutRef.current = null;
            current = nextNode(pauseNode.id);
            walk();
          }, getPauseDelayMs(pauseNode));
          return;
        }

        appended.push({ kind: "bot", nodeId: current.id, at: Date.now() });

        if (getNodeOptions(current).length > 0 || isInputNode(current)) {
          setHistory((prev) => [...prev, ...appended]);
          setWaitingNodeId(current.id);
          return;
        }
        current = nextNode(current.id);
      }

      setHistory((prev) => [...prev, ...appended]);
      setWaitingNodeId(null);
    }

    walk();
  }

  function handleStart() {
    if (!entryNode) return;
    setStarted(true);
    advance(entryNode.id);
  }

  function handleSelect(option: NodeOption) {
    if (!waitingNodeId) return;
    setSelections((prev) => ({ ...prev, [waitingNodeId]: option.id }));
    setHistory((prev) => [...prev, { kind: "user", label: option.label, at: Date.now() }]);
    advance(waitingNodeId, option.id);
  }

  function handleSubmitInput() {
    const value = inputValue.trim();
    if (!waitingNodeId || !value) return;
    setHistory((prev) => [...prev, { kind: "user", label: value, at: Date.now() }]);
    setInputValue("");
    advance(waitingNodeId);
  }

  function handleRestart() {
    clearPendingPause();
    setStarted(false);
    setWaitingNodeId(null);
    setInputValue("");
    setSelections({});
    setHistory([]);
  }

  const Header = PREVIEW_HEADERS[platform];
  const look = CHAT_LOOK[platform];
  const waitingNode = waitingNodeId
    ? (nodesById.get(waitingNodeId) as TypedNode | undefined)
    : null;
  const awaitingInput = !!waitingNode && isInputNode(waitingNode);
  const reachedEnd = started && !waitingNodeId;
  const isWa = platform === "whatsapp";
  const Canvas = isWa ? WaWallpaper : "div";

  return (
    <div className={cn("flex h-full flex-col", look.channel)}>
      <Header />
      <Canvas className={cn("flex min-h-0 flex-1 flex-col", look.canvas)}>
        <div className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto p-3">
          {context &&
            started &&
            (isWa ? (
              <div className="flex justify-center">
                <WaDateChip>{context}</WaDateChip>
              </div>
            ) : (
              <div className="mx-auto w-fit rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] text-muted-foreground">
                {context}
              </div>
            ))}
          {history.map((entry, idx) => {
            if (entry.kind === "user") {
              return (
                <div
                  key={`user-${idx}`}
                  className={cn(
                    "ml-auto w-fit max-w-[85%] px-3 py-2 text-right",
                    isWa ? "text-[14.2px] leading-4.75" : "text-[14px] leading-5",
                    look.user,
                  )}
                >
                  {entry.label}
                </div>
              );
            }

            const node = nodesById.get(entry.nodeId) as TypedNode | undefined;
            const data: NodeFields | undefined = node?.data;
            const isWaitingHere = waitingNodeId === entry.nodeId;
            const selectedOptionId = selections[entry.nodeId];

            if (node?.type === "instagramGenericTemplateNode") {
              return (
                <CardCarousel
                  key={`${entry.nodeId}-${idx}`}
                  cards={(data?.elements ?? []) as CardElement[]}
                  active={isWaitingHere}
                  selectedId={selectedOptionId}
                  onSelect={handleSelect}
                />
              );
            }

            if (node?.type === "templateNode") {
              return (
                <TemplateMessageCard
                  key={`${entry.nodeId}-${idx}`}
                  templateId={data?.template?.id}
                  at={entry.at}
                />
              );
            }

            if (node?.type === "flowNode") {
              return (
                <FlowMessageCard
                  key={`${entry.nodeId}-${idx}`}
                  flowId={data?.flow?.id}
                  at={entry.at}
                />
              );
            }

            const media = getNodeMedia(node);
            const rawBody = media
              ? media.kind !== "audio"
                ? media.caption
                : ""
              : getNodeBody(node);
            const body = parseJsonToReact(rawBody ?? "");
            const isEmptyBody = (typeof body === "string" && !body) || body == null;
            const options = getNodeOptions(node);
            // WhatsApp lists open a menu; quick replies sit under the message as chips; anything
            // else with choices is a button inside the bubble.
            const optionStyle: "buttons" | "list" | "chips" | null =
              options.length === 0
                ? null
                : node?.type === "listNode"
                  ? "list"
                  : node?.type === "instagramQuickReplyNode"
                    ? "chips"
                    : "buttons";
            const headerImage = data?.headerType === "image" ? data?.link : undefined;
            const rawFooter = data?.footer;
            const footer = rawFooter ? parseJsonToReact(rawFooter) : null;
            const ctaButton =
              node?.type === "ctaUrlNode"
                ? { label: data?.display_text, url: data?.url }
                : node?.type === "continueOnWhatsappNode"
                  ? { label: data?.buttonLabel, url: undefined }
                  : null;

            return (
              <div key={`${entry.nodeId}-${idx}`} className="space-y-1.5">
                <div className={cn("overflow-hidden", look.bot)}>
                  {headerImage && (
                    <img
                      src={getFileUrlFromKey(headerImage) || "/placeholder.svg"}
                      alt=""
                      className="h-40 w-full object-cover"
                    />
                  )}
                  {media?.kind === "image" && (
                    <img src={media.src} alt="" className="h-40 w-full object-cover" />
                  )}
                  {media?.kind === "video" && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={media.src} controls className="h-40 w-full bg-black object-cover" />
                  )}
                  {media?.kind === "audio" && (
                    <div className="px-3 pt-2">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={media.src} controls className="w-full" />
                    </div>
                  )}
                  {media?.kind === "document" && (
                    <div className="flex items-center gap-2 px-3 pt-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <IconFileText className="size-4" />
                      </div>
                      <span className="truncate text-[11px] text-foreground">
                        {media.filename || t("Document")}
                      </span>
                    </div>
                  )}
                  {!(media && isEmptyBody) && (
                    <div
                      className={cn(
                        "whitespace-pre-wrap px-3",
                        look.text,
                        look.showTime ? "pt-2" : "py-2",
                      )}
                    >
                      {isEmptyBody ? t("(empty message)") : body}
                    </div>
                  )}
                  {footer && (
                    <div className="px-3 pt-1 text-[10px] text-muted-foreground">{footer}</div>
                  )}
                  {look.showTime && (
                    <div
                      className={cn(
                        "px-2 pt-1 pb-1.5 text-right text-[11px] leading-none",
                        WA.muted,
                      )}
                    >
                      {formatTime(entry.at).toLowerCase()}
                    </div>
                  )}
                  {optionStyle === "list" && (
                    <div className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-[12px] font-medium text-wa-green">
                      <IconList className="size-3.5" />
                      {data?.button || t("View options")}
                    </div>
                  )}
                  {optionStyle === "buttons" &&
                    (() => {
                      return (
                        <div className="border-t border-border">
                          {options.map((opt, i) => {
                            const isSelected = selectedOptionId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={!isWaitingHere}
                                onClick={() => handleSelect(opt)}
                                className={cn(
                                  "text-wa-green flex w-full items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors",
                                  i > 0 && "border-t border-border",
                                  isWaitingHere && "hover:bg-muted/40",
                                  isSelected && "bg-muted/60 text-muted-foreground",
                                )}
                              >
                                <IconArrowBackUp className="size-3.5 -scale-x-100" />
                                {opt.label || t("Button")}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  {ctaButton && (
                    <div className="border-t border-border">
                      <a
                        href={ctaButton.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-wa-green flex w-full items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors hover:bg-muted/40"
                      >
                        <IconExternalLink className="size-3.5" />
                        {ctaButton.label || t("Open link")}
                      </a>
                    </div>
                  )}
                </div>
                {optionStyle === "list" && (isWaitingHere || selectedOptionId) && (
                  <ListSheet
                    options={options}
                    active={isWaitingHere}
                    selectedId={selectedOptionId}
                    onSelect={handleSelect}
                  />
                )}
                {optionStyle === "chips" && isWaitingHere && (
                  <div className="flex flex-wrap justify-end gap-1.5 pl-6">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelect(opt)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-[#efefef] dark:hover:bg-[#262626]",
                          DM.divider,
                          DM.link,
                        )}
                      >
                        {opt.label || t("Reply")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!isWa && started && waitingNodeId && awaitingInput ? (
          <DmComposer
            action={
              <button
                type="button"
                disabled={!inputValue.trim()}
                onClick={handleSubmitInput}
                className={cn("shrink-0 text-[14px] font-semibold disabled:opacity-40", DM.link)}
              >
                {t("Send")}
              </button>
            }
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitInput()}
              placeholder={t("Message...")}
              aria-label={t("Type your reply…")}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#737373] dark:placeholder:text-[#a8a8a8]"
            />
          </DmComposer>
        ) : isWa && started && waitingNodeId && awaitingInput ? (
          <WhatsAppChatInputBar
            action={
              <button
                type="button"
                aria-label={t("Send")}
                disabled={!inputValue.trim()}
                onClick={handleSubmitInput}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1daa61] text-white disabled:opacity-60 dark:bg-[#21c063] dark:text-[#0b141a]"
              >
                <IconSend2 className="size-5" aria-hidden />
              </button>
            }
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitInput()}
              placeholder={t("Message")}
              aria-label={t("Type your reply…")}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[#111b21] outline-none placeholder:text-[#667781] dark:text-[#e9edef] dark:placeholder:text-[#8696a0]"
            />
          </WhatsAppChatInputBar>
        ) : (
          <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-5">
            {!started && (
              <Button
                type="button"
                size="sm"
                disabled={!entryNode}
                onClick={handleStart}
                className="mx-auto"
              >
                {t("Start")}
              </Button>
            )}
            {started && waitingNodeId && awaitingInput && (
              <>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitInput()}
                  placeholder={t("Type your reply…")}
                  className="h-8 flex-1 text-[11px]"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!inputValue.trim()}
                  onClick={handleSubmitInput}
                >
                  {t("Send")}
                </Button>
              </>
            )}
            {started && waitingNodeId && !awaitingInput && (
              <span className="mx-auto text-[10px] text-muted-foreground">
                {t("Waiting for a reply above…")}
              </span>
            )}
            {reachedEnd && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRestart}
                className="mx-auto"
              >
                {t("Restart conversation")}
              </Button>
            )}
          </div>
        )}
      </Canvas>
    </div>
  );
}

/** A WhatsApp list, opened: its rows, one of which the person taps. */
function ListSheet({
  options,
  active,
  selectedId,
  onSelect,
}: Readonly<{
  options: NodeOption[];
  active: boolean;
  selectedId: string | undefined;
  onSelect: (option: NodeOption) => void;
}>) {
  return (
    <div className="w-[78%] overflow-hidden rounded-lg bg-white shadow-sm dark:bg-[#202c33]">
      {options.map((opt, i) => {
        const isSelected = selectedId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={!active}
            onClick={() => onSelect(opt)}
            className={cn(
              "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] text-foreground",
              i > 0 && "border-t border-border",
              active && "hover:bg-muted/40",
              !active && !isSelected && "text-muted-foreground",
            )}
          >
            <span className="truncate">{opt.label}</span>
            <span
              aria-hidden
              className={cn(
                "size-3 shrink-0 rounded-full border",
                isSelected ? "border-[3.5px] border-wa-green" : "border-input",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/** Instagram / Messenger cards, side by side. Reply buttons answer the bot; links leave. */
function CardCarousel({
  cards,
  active,
  selectedId,
  onSelect,
}: Readonly<{
  cards: CardElement[];
  active: boolean;
  selectedId: string | undefined;
  onSelect: (option: NodeOption) => void;
}>) {
  const { t } = useTranslation();
  return (
    <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
      {cards.map((card, cIdx) => (
        <div
          key={cIdx}
          className="w-36 shrink-0 overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="flex h-16 items-center justify-center bg-secondary text-[10px] text-muted-foreground">
            {t("Image")}
          </div>
          <div className="space-y-0.5 px-2.5 py-2">
            <div className="truncate text-[11px] font-medium text-foreground">
              {card.title || t("Card")}
            </div>
            {card.subtitle && (
              <div className="truncate text-[10px] text-muted-foreground">{card.subtitle}</div>
            )}
          </div>
          {(card.buttons ?? []).map((button, bIdx) => {
            const label = button.title || t("Button");
            if (button.type !== "postback") {
              return (
                <div
                  key={bIdx}
                  className="flex items-center justify-center gap-1 border-t border-border py-1.5 text-[11px] font-medium text-ch-fg"
                >
                  <IconExternalLink className="size-3" />
                  {label}
                </div>
              );
            }
            const id = button.id ?? button.payload ?? `btn_${cIdx}_${bIdx}`;
            return (
              <button
                key={bIdx}
                type="button"
                disabled={!active}
                onClick={() => onSelect({ id, label })}
                className={cn(
                  "w-full border-t border-border py-1.5 text-[11px] font-medium text-ch-fg",
                  active && "hover:bg-ch-soft",
                  selectedId === id && "bg-muted/60 text-muted-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
