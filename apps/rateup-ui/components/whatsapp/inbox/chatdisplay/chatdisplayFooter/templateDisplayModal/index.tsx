import { useDisclosure } from "@mantine/hooks";
import { RateupButtonPrimary } from "../../../../../Button/RateupButtons";
import { IconMessage2Code, IconSend } from "@tabler/icons-react";
import SimpleModalLayout from "../../../../../Modal/SimpleModalLayout";
import { Grid, Loader, RadioGroup, Stack, Text } from "@mantine/core";
import classes from "./styles.module.css";
import { WaContact } from "../../../../../../types/global";
import {
  useSendWaTemplateToUser,
  useWaTemplates,
} from "../../../../../../backend/whatsapp/whatsapp.query";
import NothingFound from "../../../../../NothingFound/NothingFound";
import WaInboxTemplateSelectCard from "./templateSelectCard";
import { useState } from "react";
interface Props {
  sessionExpired: boolean;
  waContact: WaContact;
}
export default function WaInboxTemplateDisplayModal(props: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [opened, { close: onClose, open }] = useDisclosure(false);

  const sendTemplate = useSendWaTemplateToUser(
    props?.waContact?.phone,
    props?.waContact?.id,
  );

  function handleSendTemplate() {
    sendTemplate.mutate({ templateId: selectedTemplateId });
    setSelectedTemplateId("");
    onClose();
  }

  const { data, isLoading, error } = useWaTemplates();

  if (isLoading) return <Loader />;
  if (error) return <div>Error: {error.message}</div>;
  return (
    <>
      <SimpleModalLayout
        {...{
          size: "lg",
          opened,
          onClose,
          title: props?.sessionExpired
            ? "Initiate conversation by sending a template"
            : "Send a template",
        }}
      >
        {data && data?.length > 0 ? (
          <Stack className={classes.modal_inner}>
            <Text className={classes.modal_label}>
              {props?.sessionExpired
                ? "Initiate Conversation by sending a template to the user"
                : "Send a template to the user"}
            </Text>
            <RadioGroup onChange={setSelectedTemplateId}>
              <Grid columns={6}>
                {data.map((template) => (
                  <Grid.Col key={template.id} span={2}>
                    <WaInboxTemplateSelectCard {...template} />
                  </Grid.Col>
                ))}
              </Grid>
            </RadioGroup>
            <RateupButtonPrimary
              ml="auto"
              onClick={handleSendTemplate}
              title="Send"
              rightIcon={<IconSend />}
            />
          </Stack>
        ) : (
          <NothingFound text="No templates found" />
        )}
      </SimpleModalLayout>
      <RateupButtonPrimary
        onClick={open}
        title={
          props?.sessionExpired
            ? "Initiate Conversation by Sending a Template"
            : "Send Template"
        }
        rightIcon={<IconMessage2Code />}
      />
    </>
  );
}
