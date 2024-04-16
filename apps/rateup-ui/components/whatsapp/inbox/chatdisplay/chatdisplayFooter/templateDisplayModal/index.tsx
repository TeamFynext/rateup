import { useDisclosure } from "@mantine/hooks";
import { RateupButtonPrimary } from "../../../../../Button/RateupButtons";
import SimpleModalLayout from "../../../../../Modal/SimpleModalLayout";
import { Group, RadioGroup, Stack, Tooltip } from "@mantine/core";
import classes from "./styles.module.css";
import { WaContact } from "../../../../../../types/global";
import { useSendWaTemplateToUser } from "../../../../../../backend/whatsapp/whatsapp.query";
import NothingFound from "../../../../../NothingFound/NothingFound";
import WaInboxTemplateSelectCard from "./templateSelectCard";
import { useState } from "react";
import WaInboxTemplatePreview from "./templatePreview";
import WaTemplateSF from "./templateSF";
import { TeamSelector } from "../../../../../input/TeamSelector";
import useTemplatesAvailableForTeam from "../../../../../../hooks/team";
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
  const [teamId, setTeamId] = useState<string>("");
  const templatesAvailableForTeam = useTemplatesAvailableForTeam(teamId);
  const approvedTemplates = templatesAvailableForTeam?.filter(
    (template) => template?.data?.status === "APPROVED",
  );
  const [searchTerm, setSearchTerm] = useState<string>("");

  const searchFilteredTemplates = approvedTemplates?.filter((template) =>
    template.data.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Final list of templates after applying all filters
  const filteredTemplates = searchFilteredTemplates;

  const hasTemplates = filteredTemplates && filteredTemplates?.length > 0;
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
        {true ? (
          <Stack className={classes.modal_inner}>
            <Group className={classes.template_card_list_preview_wrapper}>
              <Stack className={classes.template_card_list_wrapper}>
                <Tooltip
                  multiline
                  w={300}
                  label={
                    "Some templates might not be available for a team, since they may have Flows which are not available for the team."
                  }
                >
                  <div>
                    {" "}
                    {/* Adding a div since Tooltip isn't working on <Select /> */}
                    <TeamSelector value={teamId} onChange={setTeamId} />
                  </div>
                </Tooltip>
                <WaTemplateSF
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                />
                <RadioGroup onChange={setSelectedTemplateId} h={"100%"}>
                  {filteredTemplates?.map((template, i) => (
                    <WaInboxTemplateSelectCard {...template} key={i} />
                  ))}
                </RadioGroup>
              </Stack>
              {hasTemplates && selectedTemplateId ? (
                <WaInboxTemplatePreview
                  teamId={teamId}
                  template={
                    filteredTemplates.find(
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
        variant="transparent"
        onClick={open}
        title={
          props?.sessionExpired
            ? "Initiate Conversation by Sending a Template"
            : "Send Template"
        }
      />
    </>
  );
}
