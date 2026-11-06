import { whatsappToHTML } from "@/components/RichTextEditor/wa-editor/format.tsx";

interface Props {
  messageContent: string;
  /** Names to mark as @-mentions (a note's mentioned teammates). */
  mentions?: string[];
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Wraps each `@Name` in the already-escaped HTML, matching the names escaped the same way. */
function markMentions(html: string, names: string[]) {
  const alternatives = names
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((name) => escapeHtml(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!alternatives.length) return html;
  return html.replace(
    new RegExp(`@(${alternatives.join("|")})`, "g"),
    '<span class="rounded bg-amber-200/60 px-0.5 font-semibold dark:bg-amber-400/20">@$1</span>',
  );
}

export default function WaInboxText(props: Props) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const message = typeof props?.messageContent === "string" ? props.messageContent : "";
  const parts = message.split(urlRegex).filter(Boolean);

  return (
    <div className="text-sm overflow-hidden">
      {parts.map((text, index) =>
        urlRegex.test(text) ? (
          <a
            key={index}
            href={text}
            target="_blank"
            className="no-underline hover:underline text-blue-600 break-all"
          >
            {text}
          </a>
        ) : (
          <div
            key={index}
            dangerouslySetInnerHTML={{
              __html: markMentions(whatsappToHTML(text), props.mentions ?? []),
            }}
          />
        ),
      )}
    </div>
  );
}
