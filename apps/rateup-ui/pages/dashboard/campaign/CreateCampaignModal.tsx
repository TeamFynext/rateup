import { Button, Flex, Group, SimpleGrid, Title } from "@mantine/core";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { isNotEmpty, useForm } from "@mantine/form";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";
import { DateTimePicker } from "@mantine/dates";
import style from "./campaign.module.css";
import { CampaignStatus, CampaignType, SurveyType } from "../../../types/enums";
import { useWaTemplates } from "../../../backend/whatsapp/whatsapp.query";
import { useSurveysByTeam } from "../../../backend/surveys/surveys.query";
import {
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} from "../../../backend/campaign/campaign.query";

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
      surveyTeamMapId: isNotEmpty("Must select a survey"),
      waTemplateId: isNotEmpty("Must select a template"),
    },
  });

  const { data: templates } = useWaTemplates();
  const templatesData = templates?.map((t) => {
    return {
      value: t?.id,
      label: t?.data?.name,
    };
  });
  const { data: surveys } = useSurveysByTeam(form.values.teamId, true);
  const waSurveys = surveys?.filter((s) =>
    [SurveyType.WaFlow, SurveyType.WhatsApp].includes(s?.type),
  );
  const surveyData = waSurveys?.map((s) => {
    return {
      value: s?.surveyTeamMapId,
      label: s?.title,
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
      <form onSubmit={form.onSubmit(handleSubmit)}>
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
            classNames={{ label: style.inputLabel }}
          />
          {isEdit && campaign?.status === CampaignStatus.ACTIVE ? (
            <></>
          ) : (
            <>
              <ContainedSelection
                label="Select Survey"
                withAsterisk
                placeholder="Select Whatsapp survey to send"
                classNames={{ label: style.inputLabel }}
                {...form.getInputProps("surveyTeamMapId")}
                data={surveyData}
              />
              <ContainedSelection
                label="Choose Template"
                withAsterisk
                placeholder="Select Template"
                classNames={{ label: style.inputLabel }}
                {...form.getInputProps("waTemplateId")}
                data={templatesData}
              />{" "}
            </>
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
