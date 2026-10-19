import { IconExternalLink, IconPackage, IconPointer } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { IgTemplateButton } from "@/types/global";
import { safeHref } from "@/utils/safeHref.ts";
import type { IgTemplateContent } from "@/utils/whatsapp/inbox.ts";

/** An Instagram or Messenger template we sent: a card carousel, or text with link buttons. */
export default function IgTemplateBubble({ content }: Readonly<{ content: IgTemplateContent }>) {
  const { t } = useTranslation();

  if (content.templateType === "button") {
    return (
      <div className="flex w-full max-w-74.5 min-w-50 flex-col gap-2">
        {content.text && <p className="text-sm whitespace-pre-wrap">{content.text}</p>}
        <TemplateButtons buttons={content.buttons} />
      </div>
    );
  }

  // A "product" template names catalog items by id only; there is nothing to draw but a count.
  if (content.templateType === "product") {
    return (
      <span className="flex items-center gap-1.5 text-sm">
        <IconPackage className="size-4 shrink-0 text-muted-foreground" />
        {t("{count, plural, one {# catalog product} other {# catalog products}}", {
          count: content.elements.length,
        })}
      </span>
    );
  }

  return (
    <div className="flex max-w-80 snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {content.elements.map((element, i) => (
        <div
          key={`${element.title}-${i}`}
          className="flex w-52 shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground"
        >
          {element.image_url ? (
            <img src={element.image_url} alt="" className="aspect-square w-full object-cover" />
          ) : (
            <span className="flex aspect-[2/1] w-full items-center justify-center bg-muted">
              <IconPackage className="size-6 text-muted-foreground" />
            </span>
          )}
          <div className="flex flex-col gap-0.5 p-2.5">
            {element.title && <span className="text-sm font-semibold">{element.title}</span>}
            {element.subtitle && (
              <span className="text-xs text-muted-foreground">{element.subtitle}</span>
            )}
          </div>
          {element.buttons?.length ? (
            <div className="mt-auto border-t border-border">
              <TemplateButtons buttons={element.buttons} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** What the customer sees under the message; only link buttons do anything from here. */
function TemplateButtons({ buttons }: Readonly<{ buttons: IgTemplateButton[] }>) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {buttons.map((button, i) =>
        button.type === "web_url" && safeHref(button.url) ? (
          <a
            key={`${button.title}-${i}`}
            href={safeHref(button.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary hover:bg-muted/40"
          >
            <IconExternalLink className="size-3.5" />
            {button.title}
          </a>
        ) : (
          <span
            key={`${button.title}-${i}`}
            className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary"
          >
            <IconPointer className="size-3.5" />
            {button.title}
          </span>
        ),
      )}
    </div>
  );
}
