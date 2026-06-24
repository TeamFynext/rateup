import { Badge, Group, Loader, Radio, Stack, Title } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSendFlowToUser, useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { WaFlowStatus } from "@/types/enums.ts";

import { RateupButtonPrimary } from "../../../../../Button/RateupButtons.tsx";
import SimpleModalLayout from "../../../../../Modal/SimpleModalLayout.tsx";
import NothingFound from "../../../../../NothingFound/NothingFound.tsx";
import { usePhoneIdStore } from "../../../chatselect/accountSelectorStore.ts";
import WaInboxFlowSelectCard from "./flowSelectCard/index.tsx";

import classes from "./styles.module.css";

interface Props {
  sessionExpired: boolean;
  contact: ContactsData;
  opened: boolean;
  close: () => void;
}
export default function WaInboxFlowDisplayModal(props: Props) {
  const [selectedDbFlowId, setSelectedDbFlowId] = useState<string>("");
  const { data, isLoading, error } = useWaFlowsFromDb();
  const [teamId, setTeamId] = useState(null);
  const sendFlowToUser = useSendFlowToUser(props?.contact?.phone);
  const { whatsappSettingsPhoneId } = usePhoneIdStore();

  const { t: translations } = useTranslation();
  function onClose() {
    setSelectedDbFlowId("");
    props?.close();
  }
  function handleSendFlow() {
    sendFlowToUser.mutate(
      {
        dbFlowId: selectedDbFlowId,
        teamId,
        flowId: data?.find((f) => f.dbFlowId === selectedDbFlowId)?.flowId,
        whatsappSettingsPhoneId,
      },
      {
        onSuccess: () => {
          setSelectedDbFlowId("");
          onClose();
        },
      },
    );
  }
  const acceptedFlows = data?.filter((flow) => flow?.status === WaFlowStatus.PUBLISHED);
  return (
    <SimpleModalLayout
      {...{
        opened: props?.opened,
        onClose,
        title: "Send Flow",
        centered: true,
      }}
    >
      {isLoading && <Loader />}
      {error && <Badge color="red">{translations("Error")}</Badge>}
      {data && acceptedFlows.length > 0 ? (
        <>
          <Stack className={classes.inner}>
            <TeamSelector
              label="Select Team"
              placeholder="Select a team of the flow"
              onChange={setTeamId}
              value={teamId}
            />
            <Title order={4} fw={400} size={"sm"}>
              Select a Flow
            </Title>
            <Radio.Group value={selectedDbFlowId} onChange={(value) => setSelectedDbFlowId(value)}>
              {acceptedFlows?.map((flow) => (
                <WaInboxFlowSelectCard {...flow} />
              ))}
            </Radio.Group>
          </Stack>
          <Group className={classes.send_button_wrapper}>
            <RateupButtonPrimary
              title={translations("Send")}
              loading={sendFlowToUser.isPending}
              onClick={handleSendFlow}
              rightIcon={<IconSend />}
              disabled={!selectedDbFlowId}
            />
          </Group>
        </>
      ) : (
        <NothingFound
          text={translations("No flows found, If you already have a flow, check if its PUBLISHED")}
        />
      )}
    </SimpleModalLayout>
  );
}
