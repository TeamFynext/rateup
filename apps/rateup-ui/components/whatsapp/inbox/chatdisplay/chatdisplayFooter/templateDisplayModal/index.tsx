import { useDisclosure } from "@mantine/hooks";
import { RateupButtonPrimary } from "../../../../../Button/RateupButtons";
import { IconMessage2Code } from "@tabler/icons-react";
import SimpleModalLayout from "../../../../../Modal/SimpleModalLayout";
import { Group, Loader, RadioGroup, Stack } from "@mantine/core";
import classes from "./styles.module.css";
import { WaContact } from "../../../../../../types/global";
import {
  useSendWaTemplateToUser,
  useWaTemplates,
} from "../../../../../../backend/whatsapp/whatsapp.query";
import NothingFound from "../../../../../NothingFound/NothingFound";
import WaInboxTemplateSelectCard from "./templateSelectCard";
import { useEffect, useState } from "react";
import WaInboxTemplatePreview from "./templatePreview";
import WaTemplateSF from "./templateSF";
import { WaTemplate } from "../../../../../../backend/whatsapp/whatsapp.api";
interface Props {
  sessionExpired: boolean;
  waContact: WaContact;
}
export default function WaInboxTemplateDisplayModal(props: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [opened, { close: onClose, open }] = useDisclosure(true);
  const [sfTemplates, setSFTemplates] = useState<WaTemplate[]>([]);

  const sendTemplate = useSendWaTemplateToUser(
    props?.waContact?.phone,
    props?.waContact?.id,
  );

  const { data, isLoading, error } = useWaTemplates();
  const acceptedTemplates = data?.filter(
    (template) => template?.data?.status === "APPROVED",
  );
  useEffect(() => {
    if (acceptedTemplates) {
      setSFTemplates(acceptedTemplates);
    }
  }, [data]);
  if (isLoading) return <Loader />;
  if (error) return <div>Error: {error.message}</div>;
  return (
    <>
      <SimpleModalLayout
        {...{
          size: 1000,
          opened,
          onClose,
          title: props?.sessionExpired
            ? "Initiate conversation by sending a template"
            : "Send a template",
          noCustomHeader: true,
        }}
      >
        {acceptedTemplates && acceptedTemplates?.length > 0 ? (
          <Stack className={classes.modal_inner}>
            <Group className={classes.template_card_list_preview_wrapper}>
              <Stack className={classes.template_card_list_wrapper}>
                <WaTemplateSF
                  templateFullData={acceptedTemplates}
                  setTemplateSFData={setSFTemplates}
                />
                <RadioGroup onChange={setSelectedTemplateId} h={"100%"}>
                  {sfTemplates?.map((template) => (
                    <WaInboxTemplateSelectCard {...template} />
                  ))}
                </RadioGroup>
              </Stack>
              {selectedTemplateId ? (
                <WaInboxTemplatePreview
                  template={
                    acceptedTemplates.find(
                      (template) => template.id === selectedTemplateId,
                    )?.data
                  }
                  selectedTemplateId={selectedTemplateId}
                  sendTemplate={sendTemplate}
                  onClose={onClose}
                  setSelectedTemplateId={setSelectedTemplateId}
                />
              ) : (
                <NothingFound text="No templates Selected" />
              )}
            </Group>
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
