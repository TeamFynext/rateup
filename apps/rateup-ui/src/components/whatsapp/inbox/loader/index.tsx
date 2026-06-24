import { Flex, Group, Loader, Progress, Stack, Text } from "@mantine/core";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import classes from "./styles.module.css";

export default function WhatsAppInboxLoader({ isLoading }: { isLoading: boolean }) {
  const [progress, setProgress] = useState(0);
  const { t: translations } = useTranslation();
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setInterval(() => {
        setProgress((oldProgress) => {
          if (oldProgress === 100) {
            clearInterval(timer);
            return 100;
          }
          const diff = Math.random() * 10;
          return Math.min(oldProgress + diff, 100);
        });
      }, 500);
    } else {
      setProgress(100);
    }
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <Flex className={classes.wrapper}>
      <Stack className={classes.inner}>
        <IconBrandWhatsapp color="#0B846D" size={40} />
        <Progress value={progress} w={300} h={2} color="gray" radius={"sm"} mt={"xs"} />
        <Group gap={"xs"}>
          <Loader size={10} />
          <Text size="xs">{translations("Loading chats...")}</Text>
        </Group>
      </Stack>
    </Flex>
  );
}
