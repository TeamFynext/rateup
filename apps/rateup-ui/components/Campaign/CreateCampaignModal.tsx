import { Button, Flex, Group, SimpleGrid, Title } from "@mantine/core";
import { TeamSelector } from "../input/TeamSelector";
import { isNotEmpty, useForm } from "@mantine/form";
import {
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import { CampaignStatus, CampaignType, SurveyType } from "../../types/enums";
import { useWaTemplates } from "../../backend/whatsapp/whatsapp.query";
import {
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} from "../../backend/campaign/campaign.query";
import { getHotkeyHandler } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../utils/constants";
import useTemplatesAvailableForTeam from "../../hooks/team";

interface CreateCampaignProps {
  close: () => void;
  isEdit?: boolean;
  campaign?;
}

const CreateCampaignModal = ({
  close,
  isEdit,
  campaign,
}: CreateCampaignProps) => {
  const form = useForm({
    initialValues: {
      name: campaign?.name || "",
      type: campaign?.type || CampaignType.WHATSAPP,
      teamId: campaign?.teamId || "",
      surveyTeamMapId: campaign?.surveyTeamMapId || "",
      waTemplateId: campaign?.waTemplateId || "",
    },
    validate: {
      name: isNotEmpty("Name cannot be empty"),
      teamId: isNotEmpty("Must select a team"),
      waTemplateId: isNotEmpty("Must select a template"),
    },
  });

  const templates = useTemplatesAvailableForTeam(form.values.teamId);
  if (
    form.values.waTemplateId &&
    !templates.map((t) => t.id).includes(form.values.waTemplateId)
  ) {
    form.setFieldValue("waTemplateId", "");
  }
  const templatesData = templates?.map((t) => {
    return {
      value: t?.id,
      label: t?.data?.name,
    };
  });
  const createCampaignMutation = useCreateCampaignMutation(form.values.teamId);
  const updateCampaignMutation = useUpdateCampaignMutation(
    campaign?.id,
    campaign?.teamId,
  );

  const handleSubmit = (values) => {
    const validation = form.validate();
    if (validation.hasErrors) return;
    values.waTemplateId = values.waTemplateId;
    if (isEdit) {
      updateCampaignMutation.mutate(
        { data: values, campaignId: campaign?.id },
        {
          onSuccess: () => {
            form.reset();
            close();
          },
          onError: () => {
            form.reset();
          },
        },
      );
    } else {
      createCampaignMutation.mutate(values, {
        onSuccess: () => {
          form.reset();
          close();
        },
        onError: () => {
          form.reset();
        },
      });
    }
  };

  return (
    <>
      <form
        onSubmit={form.onSubmit(handleSubmit)}
        onKeyDown={getHotkeyHandler([
          [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
        ])}
      >
        <Group justify={"space-between"} mt={"lg"}>
          <Title order={2}>
            {isEdit ? "Edit Campaign" : "Create Campaign"}
          </Title>
          {!isEdit && (
            <TeamSelector
              placeholder="Select Team"
              withAsterisk
              allowDeselect={false}
              disabled={false}
              value={form?.getInputProps("teamId")?.value || ""}
              {...form.getInputProps("teamId")}
              styles={{
                input: { outline: "1px solid #149A8A" },
              }}
              searchable
            />
          )}
        </Group>
        <SimpleGrid cols={2} p={"lg"}>
          <ContainedTextField
            label="Campaign Name"
            placeholder="Enter campaign name"
            withAsterisk
            {...form.getInputProps("name")}
            styles={{ label: { fontWeight: "bold", fontSize: 14 } }}
          />
          {isEdit && campaign?.status === CampaignStatus.ACTIVE ? (
            <></>
          ) : (
            <ContainedSelection
              label="Choose Template"
              withAsterisk
              placeholder="Select Template"
              styles={{ label: { fontWeight: "bold", fontSize: 14 } }}
              {...form.getInputProps("waTemplateId")}
              data={templatesData}
            />
          )}
        </SimpleGrid>
        <Flex justify={"flex-end"} gap={"md"} mt={"md"}>
          <Button variant="outline" radius={"xl"} onClick={close}>
            Cancel
          </Button>
          <Button
            radius={"xl"}
            type={"submit"}
            loading={
              createCampaignMutation.isPending ||
              updateCampaignMutation.isPending
            }
          >
            {isEdit ? "Edit" : "Create Now"}
          </Button>
        </Flex>
      </form>
    </>
  );
};

export default CreateCampaignModal;
