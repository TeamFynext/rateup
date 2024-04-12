import { useDisclosure } from "@mantine/hooks";
import { RateupButtonPrimary } from "../../../../../Button/RateupButtons";
import { IconSend } from "@tabler/icons-react";
import SimpleModalLayout from "../../../../../Modal/SimpleModalLayout";
import {
  useSendFlowToUser,
  useWaFlowsFromDb,
} from "../../../../../../backend/whatsapp/flow/flow.query";
import { Badge, Group, Loader, Radio, Stack } from "@mantine/core";
import NothingFound from "../../../../../NothingFound/NothingFound";
import { useState } from "react";
import WaInboxFlowSelectCard from "./flowSelectCard";
import classes from "./styles.module.css";
import { WaContact } from "../../../../../../types/global";
import { WaFlowStatus } from "../../../../../../types/enums";

interface Props {
  sessionExpired: boolean;
  waContact: WaContact;
}
export default function WaInboxFlowDisplayModal(props: Props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedDbFlowId, setSelectedDbFlowId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const { data, isLoading, error } = useWaFlowsFromDb();
  const sendFlowToUser = useSendFlowToUser(props?.waContact?.phone);
  function onClose() {
    setSelectedDbFlowId("");
    close();
  }
  function handleSendFlow() {
    setLoading(true);
    sendFlowToUser.mutate(selectedDbFlowId, {
      onSuccess: () => {
        setSelectedDbFlowId("");
        setLoading(false);
        onClose();
      },
    });
    setLoading(false);
  }
  if (isLoading) return <Loader />;
  if (error) return <Badge color="red">Error</Badge>;
  const acceptedFlows = data?.filter(
    (flow) => flow?.status === WaFlowStatus.PUBLISHED,
  );
  return (
    <>
      <SimpleModalLayout
        {...{
          opened,
          onClose,
          title: "Send Flow",
          centered: true,
        }}
      >
        {data && acceptedFlows.length > 0 ? (
          <>
            <Stack className={classes.inner}>
              <Radio.Group
                value={selectedDbFlowId}
                onChange={setSelectedDbFlowId}
              >
                {acceptedFlows?.map((flow) => (
                  <WaInboxFlowSelectCard {...flow} />
                ))}
              </Radio.Group>
            </Stack>
            <Group className={classes.send_button_wrapper}>
              <RateupButtonPrimary
                title={"Send"}
                loading={loading}
                onClick={handleSendFlow}
                rightIcon={<IconSend />}
                disabled={!selectedDbFlowId}
              />
            </Group>
          </>
        ) : (
          <NothingFound text="No flows found, If you already have a flow, check if its PUBLISHED" />
        )}
      </SimpleModalLayout>
      <RateupButtonPrimary
        variant="transparent"
        onClick={open}
        title={"Send Flow"}
      />
    </>
  );
}
