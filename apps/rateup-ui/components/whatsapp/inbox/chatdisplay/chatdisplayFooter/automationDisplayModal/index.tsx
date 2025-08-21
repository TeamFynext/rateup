import { useState } from "react";

import {
  Badge,
  Card,
  Group,
  Loader,
  Radio,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useAllWaAutomatedReplies,
  useInitiateWaAutomatedReplyMutation,
  useWaAutomatedReplies,
  useWaAutomatedRepliesMessageById,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { data } from "@/components/GenerateQr/tempdata";
import SimpleModalLayout from "@/components/Modal/SimpleModalLayout";
import NothingFound from "@/components/NothingFound/NothingFound";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

import classes2 from "../flowDisplayModel/flowSelectCard/styles.module.css";
import classes from "../flowDisplayModel/styles.module.css";

interface Props {
  sessionExpired: boolean;
  opened: boolean;
  close: () => void;
  contact: ContactsData;
}

export default function WaInboxAutomationDisplayModal(props: Props) {
  const [selectedAutomationId, setSelectedAutomationId] = useState<string>("");
  const { data: automations, isLoading, error } = useAllWaAutomatedReplies();
  const initiate = useInitiateWaAutomatedReplyMutation(selectedAutomationId);
  function onClose() {
    setSelectedAutomationId("");
    props?.close();
  }
  const translations = useTranslations();
  function handleSendAutomatedReply() {
    initiate.mutate(
      { phone: props?.contact?.phone },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  }

  return (
    <>
      <SimpleModalLayout
        {...{
          opened: props?.opened,
          onClose,
          title: "Initiate Automation",
          centered: true,
        }}
      >
        {isLoading && <Loader />}
        {error && <Badge color="red">error</Badge>}
        {automations && automations?.length > 0 ? (
          <>
            <Stack className={classes.inner}>
              <Title order={4} fw={400} size={"sm"}>
                Select a automation
              </Title>
              <Radio.Group
                value={selectedAutomationId}
                onChange={setSelectedAutomationId}
              >
                {automations?.map((automation) => (
                  <Card className={classes2.wrapper}>
                    <Radio
                      className={classes2.inner}
                      value={automation?.id}
                      label={automation?.name}
                      fz={"xs"}
                    />
                  </Card>
                ))}
              </Radio.Group>
            </Stack>
            <Group className={classes.send_button_wrapper}>
              <RateupButtonPrimary
                title={translations("Send")}
                loading={initiate.isPending}
                onClick={handleSendAutomatedReply}
                rightIcon={<IconSend />}
                disabled={!selectedAutomationId}
              />
            </Group>
          </>
        ) : (
          <NothingFound text={"No Automations found"} />
        )}
      </SimpleModalLayout>
    </>
  );
}
