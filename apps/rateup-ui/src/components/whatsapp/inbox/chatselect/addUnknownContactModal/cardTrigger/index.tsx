import { Button, Card, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import classes from "./styles.module.css";

export default function CardTrigger(props: { phone: string; onClick: () => void }) {
  const { t: translations } = useTranslation();
  return (
    <Card withBorder className={classes.wrapper}>
      <Stack className={classes.inner_text_wrapper}>
        <Text>{translations("This PhoneNumber is not in your contact list")}</Text>
        <Text>
          {translations("Message")} {props.phone} {translations("on Whatsap?")}
        </Text>
      </Stack>
      <Button onClick={props.onClick} className={classes.button}>
        {translations("Add and Message")}
      </Button>
    </Card>
  );
}
