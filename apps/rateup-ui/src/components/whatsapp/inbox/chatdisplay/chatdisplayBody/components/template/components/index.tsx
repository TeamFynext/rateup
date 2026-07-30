import { IconMessageReply } from "@tabler/icons-react";
import React from "react";

import { Button } from "@/components/ui/button.tsx";
import TextWithFormatting from "@/components/whatsapp/templates/Details/TextWithFormating.tsx";
import type { WaTemplateComponent, WaTemplateFetchBodyComponent } from "@/types/global";

interface Props {
  templateComponent: WaTemplateFetchBodyComponent;
  parameterData: WaTemplateComponent;
}

export default function WaInboxTemplateComponents(props: Readonly<Props>) {
  switch (props?.templateComponent?.type) {
    case "HEADER":
      return (
        <WaInboxTemplateHeader
          parameterData={props?.parameterData}
          templateComponent={props?.templateComponent}
        />
      );
    case "BODY":
      return <WaInboxTemplateBody {...props} />;
    case "FOOTER":
      return <WaInboxTemplateFooter {...props?.templateComponent} />;
    case "BUTTONS":
      return <WaInboxTemplateButtons {...props?.templateComponent} />;
  }
}

const WaInboxTemplateHeader = (props: Props) => {
  function getUrlIfParameterIsPresent(): string {
    if (props?.parameterData) {
      // A media header's payload sits under the lowercased format key.
      const mediaKey = props?.templateComponent?.format?.toLowerCase() as
        | "image"
        | "video"
        | "document";
      const media = props?.parameterData?.parameters[0]?.[mediaKey];
      if (media?.link instanceof File) {
        return URL.createObjectURL(media.link);
      } else {
        return media?.link ?? "";
      }
    } else {
      return props?.templateComponent?.example?.header_handle[0];
    }
  }
  switch (props?.templateComponent?.format) {
    case "TEXT":
      return <span className="text-md font-semibold">{props?.templateComponent?.text}</span>;
    case "IMAGE":
      return (
        <img
          src={getUrlIfParameterIsPresent()}
          className="max-h-[300px] w-full object-cover rounded-md"
          alt="Header template image"
        />
      );
    case "DOCUMENT":
      return (
        <iframe
          src={getUrlIfParameterIsPresent()}
          className="w-full border rounded-md"
          title="Header template document"
        />
      );
  }
};

const WaInboxTemplateBody = (props: Props) => {
  return (
    <p className="text-sm font-normal leading-relaxed">
      {TextWithFormatting(
        props?.templateComponent?.text ?? "",
        (props?.parameterData?.parameters?.map((data) => data?.text ?? "") ||
          props?.templateComponent?.example?.body_text?.[0]) ??
          [],
      )}
    </p>
  );
};

const WaInboxTemplateFooter = (props: WaTemplateFetchBodyComponent) => {
  // Colour is inherited from the bubble (white on the outgoing fill); the footer
  // is dimmed with opacity instead of a fixed muted token so it stays legible.
  return <p className="text-xs font-light opacity-70">{props?.text}</p>;
};

const WaInboxTemplateButtons = (props: WaTemplateFetchBodyComponent) => {
  return (
    <div className="flex flex-col gap-0">
      {props?.buttons?.map((button, i) => (
        <React.Fragment key={i}>
          {i === 0 && <div className="border-t border-current/25" />}
          <Button
            variant="ghost"
            // Template buttons render inside the outgoing (primary-filled) bubble,
            // so they track the bubble's own foreground colour rather than naming
            // one — a fixed indigo/foreground disappears against the fill.
            className="w-full justify-center text-xs h-9 gap-1.5 rounded-none text-current hover:bg-current/15 hover:text-current dark:hover:bg-current/15"
          >
            <IconMessageReply size={16} />
            <span>{button?.text}</span>
          </Button>
          {i !== (props?.buttons?.length ?? 0) - 1 && (
            <div className="border-t border-current/25" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
