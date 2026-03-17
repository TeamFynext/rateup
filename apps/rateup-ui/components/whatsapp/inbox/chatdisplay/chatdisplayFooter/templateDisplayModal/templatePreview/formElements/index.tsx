"use client";

import { useCallback } from "react";

import { Divider, Paper, Stack, Text } from "@mantine/core";
import { useExtracted } from "next-intl";
import { Updater } from "use-immer";

import { WaTemplateFetchBody } from "@/types/global";
import { MetaAssets } from "@/backend/whatsapp/settings/waSettings.api";
import { LeadgenNodeData } from "@/components/whatsapp/automation/types/node-types";

import WaTemplateFormComponents from "./components";
import classes from "./styles.module.css";

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
  const translations = useExtracted();
  const buildtemplatequerycomponent = useCallback(
    (
      component_type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS",
      component_format: "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION",
      component_data: any,
    ) => {
      switch (component_type) {
        case "HEADER":
          props?.setParameterData((draft: Array<any>) => {
            const existingItem = draft.find(
              (item) => item.type === component_type.toLowerCase(),
            );
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
              component_data?.forEach((variable, i) => {
                existingItem.parameters[i] = {
                  type: "text",
                  text: variable,
                };
              });
            } else {
              draft.push({
                type: component_type.toLowerCase(),
                parameters: component_data?.map((variable) => ({
                  type: "text",
                  text: variable,
                })),
              });
            }
          });
          break;
      }
    },
    [],
  );
  return (
    <Stack className={classes.wrapper}>
      {props?.template?.components?.map((component, i) => {
        let exampleParams = props.parameters?.find(
          (data) => data.type === component.type?.toLowerCase(),
        )?.parameters;
        switch (component.type) {
          case "HEADER":
            return (
              <Stack gap={"xs"} key={i}>
                <Divider
                  label={translations("Header parameters")}
                  labelPosition="left"
                  className={classes.divider}
                />
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
              </Stack>
            );
          case "BODY":
            return (
              <Stack gap={"xs"} key={i}>
                <Divider
                  label={translations("Body parameters")}
                  labelPosition="left"
                  className={classes.divider}
                />
                {component?.example?.body_text?.[0]?.length ? (
                  <WaTemplateFormComponents
                    type={"TEXT"}
                    buildtemplatequerycomponent={buildtemplatequerycomponent}
                    exampleParams={
                      exampleParams?.length > 0
                        ? exampleParams?.map((ep) => ep?.text)
                        : component?.example?.body_text?.[0]
                    }
                    leadgenData={props?.leadgenData}
                  />
                ) : (
                  <NoParams type={"Body"} />
                )}
              </Stack>
            );
          case "FOOTER":
            return (
              <Stack gap={"xs"} key={i}>
                <Divider
                  label={translations("Footer parameters")}
                  labelPosition="left"
                  className={classes.divider}
                />
                <NoParams type={"Footer"} />
              </Stack>
            );
          case "BUTTONS":
            return (
              <Stack gap={"xs"} key={i}>
                <Divider
                  label={translations("Button parameters")}
                  labelPosition="left"
                  className={classes.divider}
                />
                <NoParams type={"Button"} />
              </Stack>
            );
          default:
        }
      })}
    </Stack>
  );
}

export function NoParams({
  type,
}: {
  type: "Header" | "Body" | "Footer" | "Button";
}) {
  return (
    <Paper className={classes.no_params_wrapper}>
      <Text className={classes.no_params_text}>No {type} Parameters</Text>
    </Paper>
  );
}
