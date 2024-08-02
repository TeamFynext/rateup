import { Button, Card, Stack, Text } from "@mantine/core";

import classes from "./styles.module.css";

export default function UnknownContactAddCard(props: {
  phone: string;
  onClick: () => void;
}) {
  return (
    <Card withBorder className={classes.wrapper}>
      <Stack className={classes.inner_text_wrapper}>
        <Text>This PhoneNumber is not in your contact list</Text>
        <Text>Message {props.phone} on Whatsap?</Text>
      </Stack>
      <Button onClick={props.onClick} className={classes.button}>
        Add and Message
      </Button>
    </Card>
  );
}
