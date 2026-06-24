import { Badge, Card, Group, Loader, Radio, Stack, Title } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAllWaAutomatedReplies,
  useInitiateWaAutomatedReplyMutation,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";
import SimpleModalLayout from "@/components/Modal/SimpleModalLayout.tsx";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";

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
  const { t: translations } = useTranslation();
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
                onChange={(value) => setSelectedAutomationId(value)}
              >
                {automations?.map((automation) => (
                  <Card className={classes2.wrapper} key={automation?.id}>
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
