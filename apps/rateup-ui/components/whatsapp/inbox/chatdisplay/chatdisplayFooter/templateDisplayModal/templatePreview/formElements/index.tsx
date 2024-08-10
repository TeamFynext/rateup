import { useCallback } from "react";

import { Divider, Paper, Stack, Text } from "@mantine/core";
import { Updater } from "use-immer";

import { WaTemplateFetchBody } from "@/types/global";

import WaTemplateFormComponents from "./components";
import classes from "./styles.module.css";

interface Props {
  setParameterData: Updater<any>;
  template: WaTemplateFetchBody;
}
export default function WaTemplateFormElements(props: Props) {
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
        switch (component.type) {
          case "HEADER":
            return (
              <>
                <Divider
                  label="Header parameters"
                  labelPosition="left"
                  className={classes.divider}
                />
                {component?.format === "IMAGE" ||
                component?.format === "VIDEO" ||
                component?.format === "DOCUMENT" ? (
                  <WaTemplateFormComponents
                    type={component?.format}
                    buildtemplatequerycomponent={buildtemplatequerycomponent}
                  />
                ) : component?.format === "LOCATION" ? (
                  <WaTemplateFormComponents
                    type={component?.format}
                    buildtemplatequerycomponent={buildtemplatequerycomponent}
                  />
                ) : (
                  <NoParams type={"Header"} />
                )}
              </>
            );
          case "BODY":
            return (
              <>
                <Divider
                  label="Body parameters"
                  labelPosition="left"
                  className={classes.divider}
                />
                {component?.example?.body_text?.[0]?.length ? (
                  <WaTemplateFormComponents
                    type={"TEXT"}
                    buildtemplatequerycomponent={buildtemplatequerycomponent}
                    exampleParams={component?.example?.body_text?.[0]}
                  />
                ) : (
                  <NoParams type={"Body"} />
                )}
              </>
            );
          case "FOOTER":
            return (
              <>
                <Divider
                  label="Footer parameters"
                  labelPosition="left"
                  className={classes.divider}
                />
                <NoParams type={"Footer"} />
              </>
            );
          case "BUTTONS":
            return (
              <>
                <Divider
                  label="Button parameters"
                  labelPosition="left"
                  className={classes.divider}
                />
                <NoParams type={"Button"} />
              </>
            );
          default:
        }
      })}
    </Stack>
  );
}

function NoParams({ type }: { type: "Header" | "Body" | "Footer" | "Button" }) {
  return (
    <Paper className={classes.no_params_wrapper}>
      <Text className={classes.no_params_text}>No {type} Parameters</Text>
    </Paper>
  );
}
