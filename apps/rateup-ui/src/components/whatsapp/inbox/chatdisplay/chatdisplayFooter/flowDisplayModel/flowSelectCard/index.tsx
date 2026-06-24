import { Badge, Card, Group, Radio } from "@mantine/core";

import classes from "./styles.module.css";

export default function WaInboxFlowSelectCard(props: DbFlow) {
  return (
    <Card className={classes.wrapper}>
      <Radio className={classes.inner} value={props?.dbFlowId} label={props?.name} fz={"xs"} />
      <Group>
        <Badge variant="outline">{props?.status}</Badge>
      </Group>
    </Card>
  );
}
