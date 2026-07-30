import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Updater } from "use-immer";

import type { MetaAssets } from "@/backend/whatsapp/settings/waSettings.api";
import type { LeadgenNodeData } from "@/components/whatsapp/automation/types/node-types.ts";
import type { WaTemplateFetchBody } from "@/types/global";

import WaTemplateFormComponents from "./components/index.tsx";

interface Props {
  setParameterData: Updater<any>;
  template: WaTemplateFetchBody;
  parameters?: Array<any>;
  leadgenData?: {
    data: LeadgenNodeData;
    formQuestions: MetaAssets["leadgenForms"][number]["questions"];
  };
}
export default function WaTemplateFormElements(props: Props) {
  const { t: translations } = useTranslation();
  const buildtemplatequerycomponent = useCallback(
    (
      component_type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS",
      component_format: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "TEXT",
      component_data: any,
    ) => {
      switch (component_type) {
        case "HEADER":
          props?.setParameterData((draft: Array<any>) => {
            const existingItem = draft.find((item) => item.type === component_type.toLowerCase());
            if (existingItem) {
              existingItem.parameters[0] = {
                type: component_format.toLowerCase(),
                [component_format.toLowerCase()]: component_data,
              };
            } else {
              draft.push({
                type: component_type.toLowerCase(),
                parameters: [
                  {
                    type: component_format.toLowerCase(),
                    [component_format.toLowerCase()]: component_data,
                  },
                ],
              });
            }
          });
          break;
        case "BODY":
          props?.setParameterData((draft: Array<any>) => {
            const existingItem = draft.find((item) => {
              return item.type === component_type.toLowerCase();
            });
            if (existingItem) {
              component_data?.forEach((variable: { text?: string }, i: number) => {
                existingItem.parameters[i] = {
                  type: "text",
                  text: variable,
                };
              });
            } else {
              draft.push({
                type: component_type.toLowerCase(),
                parameters: component_data?.map((variable: { text?: string }) => ({
                  type: "text",
                  text: variable,
                })),
              });
            }
          });
          break;
      }
    },
    [props],
  );

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {props?.template?.components?.map((component, i) => {
        const exampleParams = props.parameters?.find(
          (data) => data.type === component.type?.toLowerCase(),
        )?.parameters;
        switch (component.type) {
          case "HEADER":
            return (
              <div className="flex flex-col gap-2" key={i}>
                <div className="relative flex py-2 items-center sticky top-0 bg-background z-10">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-background pr-3 shrink-0">
                    {translations("Header parameters")}
                  </span>
                  <div className="flex-grow border-t border-border" />
                </div>
                {component?.format === "IMAGE" ||
                component?.format === "VIDEO" ||
                component?.format === "DOCUMENT" ? (
                  <WaTemplateFormComponents
                    type={component?.format}
                    buildtemplatequerycomponent={buildtemplatequerycomponent}
                    exampleParams={exampleParams}
                  />
                ) : component?.format === "LOCATION" ? (
                  <WaTemplateFormComponents
                    type={component?.format}
                    buildtemplatequerycomponent={buildtemplatequerycomponent}
                    exampleParams={exampleParams}
                  />
                ) : (
                  <NoParams type={"Header"} />
                )}
              </div>
            );
          case "BODY":
            return (
              <div className="flex flex-col gap-2" key={i}>
                <div className="relative flex py-2 items-center sticky top-0 bg-background z-10">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-background pr-3 shrink-0">
                    {translations("Body parameters")}
                  </span>
                  <div className="flex-grow border-t border-border" />
                </div>
                {component?.example?.body_text?.[0]?.length ? (
                  <WaTemplateFormComponents
                    type={"TEXT"}
                    buildtemplatequerycomponent={buildtemplatequerycomponent}
                    exampleParams={
                      exampleParams?.length > 0
                        ? exampleParams?.map((ep: { text?: string }) => ep?.text)
                        : component?.example?.body_text?.[0]
                    }
                    leadgenData={props?.leadgenData}
                  />
                ) : (
                  <NoParams type={"Body"} />
                )}
              </div>
            );
          case "FOOTER":
            return (
              <div className="flex flex-col gap-2" key={i}>
                <div className="relative flex py-2 items-center sticky top-0 bg-background z-10">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-background pr-3 shrink-0">
                    {translations("Footer parameters")}
                  </span>
                  <div className="flex-grow border-t border-border" />
                </div>
                <NoParams type={"Footer"} />
              </div>
            );
          case "BUTTONS":
            return (
              <div className="flex flex-col gap-2" key={i}>
                <div className="relative flex py-2 items-center sticky top-0 bg-background z-10">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-background pr-3 shrink-0">
                    {translations("Button parameters")}
                  </span>
                  <div className="flex-grow border-t border-border" />
                </div>
                <NoParams type={"Button"} />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export function NoParams({ type }: { type: "Header" | "Body" | "Footer" | "Button" }) {
  return (
    <div className="shadow-xs p-3 bg-muted/40 rounded-lg border border-border/40">
      <p className="text-center text-xs text-muted-foreground">No {type} Parameters</p>
    </div>
  );
}
