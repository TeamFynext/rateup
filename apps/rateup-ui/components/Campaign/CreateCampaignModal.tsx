import { Box, Flex, Group, SimpleGrid, Title } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import {
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} from "../../backend/campaign/campaign.query";
import useTemplatesAvailableForTeam from "../../hooks/team";
import { CampaignStatus, CampaignType } from "../../types/enums";
import { SAVE_HOTKEY } from "../../utils/constants";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import {
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";

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
      flowId: campaign?.flowId || "",
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
    templates?.length &&
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
    const flowId =
      templates
        ?.find((t) => t?.id === values?.waTemplateId)
        ?.data?.components?.find((c) => c?.buttons)
        ?.buttons?.find((b) => b?.type === "FLOW")?.flow_id ?? null;
    values.flowId = flowId;
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
        {!isEdit && (
          <Group justify={"space-between"} mt={4}>
            <Title order={2}>Create Campaign</Title>
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
          </Group>
        )}
        <SimpleGrid cols={isEdit ? 3 : 2} p={"lg"}>
          <ContainedTextField
            label="Campaign Name"
            placeholder="Enter campaign name"
            withAsterisk
            {...form.getInputProps("name")}
            styles={{ label: { fontWeight: "bold", fontSize: 14 } }}
          />
          <ContainedSelection
            label="Choose Template"
            withAsterisk
            placeholder="Select Template"
            {...form.getInputProps("waTemplateId")}
            readOnly={isEdit && campaign?.status === CampaignStatus.ACTIVE}
            data={templatesData}
            styles={{
              input: {
                cursor:
                  isEdit && campaign?.status === CampaignStatus.ACTIVE
                    ? "default"
                    : "pointer",
              },
            }}
          />
          {isEdit && (
            <Box mt={26}>
              <RateupButtonPrimary
                loading={updateCampaignMutation.isPending}
                title="Update"
                disabled={!form.isDirty()}
              />
            </Box>
          )}
        </SimpleGrid>
        {!isEdit && (
          <Flex justify={"flex-end"} gap={"md"} mt={"md"}>
            <RateupButtonPrimary
              onClick={close}
              title="Cancel"
              variant="outline"
            />
            <RateupButtonPrimary
              title="Create Now"
              loading={createCampaignMutation.isPending}
            />
          </Flex>
        )}
      </form>
    </>
  );
};

export default CreateCampaignModal;
