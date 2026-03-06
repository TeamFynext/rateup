import { Card, Radio } from "@mantine/core";

import { WaTemplate } from "../../../../../../../backend/whatsapp/whatsapp.api";
import classes from "./styles.module.css";

export default function WaInboxTemplateSelectCard(props: WaTemplate) {
  return (
    <Card className={classes.wrapper}>
      <Radio value={props?.id} label={props?.data?.name} fz={"xs"} />
    </Card>
  );
}
