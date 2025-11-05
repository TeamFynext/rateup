"use client";

import { useState } from "react";

import { Group, RadioGroup, Stack, Tooltip } from "@mantine/core";
import { useTranslations } from "next-intl";

import { useSendWaTemplateToUser } from "../../../../../../backend/whatsapp/whatsapp.query";
import useTemplatesAvailableForTeam from "../../../../../../hooks/team";
import { TeamSelector } from "../../../../../input/TeamSelector";
import SimpleModalLayout from "../../../../../Modal/SimpleModalLayout";
import NothingFound from "../../../../../NothingFound/NothingFound";
import { usePhoneIdStore } from "../../../chatselect/accountSelectorStore";
import classes from "./styles.module.css";
import WaInboxTemplatePreview from "./templatePreview";
import WaInboxTemplateSelectCard from "./templateSelectCard";
import WaTemplateSF from "./templateSF";

interface Props {
  sessionExpired: boolean;
  contact: ContactsData;
  opened: boolean;
  onClose: any;
}

export default function WaInboxTemplateDisplayModal({
  sessionExpired,
  contact,
  opened,
  onClose,
}: Readonly<Props>) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const sendTemplate = useSendWaTemplateToUser(contact?.phone, contact?.id);
  const [teamId, setTeamId] = useState<string>("");
  const { whatsappSettingsPhoneId } = usePhoneIdStore();
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

  const hasTemplates =
    filteredTemplates &&
    filteredTemplates?.length > 0 &&
    searchFilteredTemplates?.find((data) => data.id === selectedTemplateId);
  const translations = useTranslations();
  return (
    <SimpleModalLayout
      {...{
        size: 1000,
        opened,
        onClose,
        title: sessionExpired
          ? translations("Initiate conversation by sending a template")
          : translations("Send a template"),
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
                label={translations(
                  "Some templates might not be available for a team, since they may have Flows which are not available for the team",
                )}
              >
                <div>
                  {" "}
                  {/* Adding a div since Tooltip isn't working on <Select /> */}
                  <TeamSelector
                    value={teamId}
                    onChange={setTeamId}
                    className={classes["team-selector-contained-input-field"]}
                  />
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
                whatsappSettingsPhoneId={whatsappSettingsPhoneId}
              />
            ) : (
              <NothingFound
                className={classes.nothing_found}
                text={translations("No templates Selected")}
              />
            )}
          </Group>
        </Stack>
      ) : (
        <NothingFound text={translations("No templates found")} />
      )}
    </SimpleModalLayout>
  );
}
