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
      if (
        props?.parameterData?.parameters[0]?.[props?.templateComponent?.format?.toLowerCase()]
          ?.link instanceof File
      ) {
        return URL.createObjectURL(
          props?.parameterData?.parameters[0]?.[props?.templateComponent?.format?.toLowerCase()]
            ?.link,
        );
      } else {
        return props?.parameterData?.parameters[0]?.[
          props?.templateComponent?.format?.toLowerCase()
        ]?.link;
      }
    } else {
      return props?.templateComponent?.example?.header_handle[0];
    }
  }
  switch (props?.templateComponent?.format) {
    case "TEXT":
      return (
        <span className="text-md font-semibold text-foreground">
          {props?.templateComponent?.text}
        </span>
      );
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
    <p className="text-sm font-normal text-foreground leading-relaxed">
      {TextWithFormatting(
        props?.templateComponent?.text,
        (props?.parameterData?.parameters?.map((data) => data?.text) ||
          props?.templateComponent?.example?.body_text?.[0]) ??
          [],
      )}
    </p>
  );
};

const WaInboxTemplateFooter = (props: WaTemplateFetchBodyComponent) => {
  return <p className="text-xs font-light text-muted-foreground">{props?.text}</p>;
};

const WaInboxTemplateButtons = (props: WaTemplateFetchBodyComponent) => {
  return (
    <div className="flex flex-col gap-0">
      {props?.buttons?.map((button, i) => (
        <React.Fragment key={i}>
          {i === 0 && <div className="border-t border-border" />}
          <Button
            variant="ghost"
            className="w-full justify-center text-xs h-9 text-indigo-600 gap-1.5 hover:bg-muted/40 rounded-none"
          >
            <IconMessageReply size={16} />
            <span>{button?.text}</span>
          </Button>
          {i !== props?.buttons?.length - 1 && <div className="border-t border-border" />}
        </React.Fragment>
      ))}
    </div>
  );
};
