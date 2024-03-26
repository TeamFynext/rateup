import { Box, Paper } from "@mantine/core";
import { WaTemplateFetchBody } from "../../../../../../../types/global";
import WaInboxTemplateComponents from "./components";
import classes from "./styles.module.css";
export default function WaInboxTemplate(props: WaTemplateFetchBody) {
  return (
    <Box className={classes.template_wrapper}>
      {props?.components?.map((component) => (
        <WaInboxTemplateComponents {...component} />
      ))}
    </Box>
  );
}
