import { Box } from "@mantine/core";

import {
  WaTemplateComponent,
  WaTemplateFetchBody,
} from "../../../../../../../types/global";
import WaInboxTemplateComponents from "./components";
import classes from "./styles.module.css";

interface Props {
  templateBody: WaTemplateFetchBody;
  parameters: WaTemplateComponent[];
}
export default function WaInboxTemplate(props: Props) {
  return (
    <Box className={classes.template_wrapper}>
      {props?.templateBody?.components?.map((component, i) => (
        <WaInboxTemplateComponents
          key={i}
          parameterData={props?.parameters?.find(
            (param) => param?.type === component?.type.toLowerCase(),
          )}
          templateComponent={component}
        />
      ))}
    </Box>
  );
}
