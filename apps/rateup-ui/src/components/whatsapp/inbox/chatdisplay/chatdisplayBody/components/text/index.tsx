import { whatsappToHTML } from "@/components/RichTextEditor/waTextEditor.tsx";

interface Props {
  messageContent: string;
}
export default function WaInboxText(props: Props) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const message =
    typeof props?.messageContent === "string" ? props.messageContent : "";
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
            dangerouslySetInnerHTML={{ __html: whatsappToHTML(text) }}
          />
        ),
      )}
    </div>
  );
}
