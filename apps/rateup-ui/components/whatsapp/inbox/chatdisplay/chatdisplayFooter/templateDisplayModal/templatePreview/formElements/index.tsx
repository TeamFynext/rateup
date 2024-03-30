import { WaTemplateFetchBody } from "../../../../../../../../types/global";
import { Divider, Paper, Stack, Text } from "@mantine/core";
import classes from "./styles.module.css";
import WaTemplateFormComponents from "./components";
import { useCallback } from "react";
import { Updater } from "use-immer";

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
                <NoParams type={"Body"} />
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
