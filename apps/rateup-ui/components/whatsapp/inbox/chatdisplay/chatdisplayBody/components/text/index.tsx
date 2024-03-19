import { Text } from "@mantine/core";
import classes from "./styles.module.css";
interface Props {
  messageContent: string;
}
export default function WaInboxText(props: Props) {
  return <Text className={classes.text}>{props?.messageContent}</Text>;
}
