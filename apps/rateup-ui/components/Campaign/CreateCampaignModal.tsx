import { useEffect } from "react";

import {
  Box,
  Flex,
  Group,
  SimpleGrid,
  Switch,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";

import { CampaignStatus, CampaignType } from "@/types/enums";
import useTemplatesAvailableForTeam from "@/hooks/team";
import {
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} from "@/backend/campaign/campaign.query";
import useTranslations from "@/dictionaries/useTranslation";
import { SAVE_HOTKEY } from "@/utils/constants";

import { RateupButtonPrimary } from "../Button/RateupButtons";
import { AccountSelector } from "../input/AccountSelector";
import {
  ContainedSelection,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";

interface CreateCampaignProps {
  close: () => void;
  isEdit?: boolean;
  campaign?;
  dynamicVariables?: string[];
}

const CreateCampaignModal = ({
  close,
  isEdit,
  campaign,
  dynamicVariables,
}: CreateCampaignProps) => {
  const schema = z
    .object({
      teamId: z.string().min(1, { message: "Must select a team" }),
      name: z.string().trim().min(1, { message: "Name cannot be empty" }),
      waTemplateId: z.string().min(1, { message: "Must select a template" }),
      type: z.nativeEnum(CampaignType),
      surveyTeamMapId: z.string().optional(),
      flowId: z.string().optional(),
      dynamicTags: z.array(z.string().trim().nullable()),
      useUserConsent: z.boolean(),
      whatsappSettingsPhoneId: z.string().min(1),
    })
    .superRefine((values, ctx) => {
      dynamicVariables?.map((_, i) => {
        if (!values.dynamicTags?.[i]) {
          ctx.addIssue({
            path: [`dynamicTags.${i}`],
            code: z.ZodIssueCode.custom,
            message: "Select a tag",
          });
        }
      });
    });
  const form = useForm<z.infer<typeof schema>>({
    initialValues: {
      name: campaign?.name || "",
      type: campaign?.type || CampaignType.WHATSAPP,
      teamId: campaign?.teamId || "",
      surveyTeamMapId: campaign?.surveyTeamMapId || "",
      waTemplateId: campaign?.waTemplateId || "",
      flowId: campaign?.flowId || "",
      dynamicTags: campaign?.dynamicTags || [],
      useUserConsent: campaign?.useUserConsent ?? true,
      whatsappSettingsPhoneId: campaign?.whatsappSettingsPhoneId || "",
    },
    validate: zodResolver(schema),
  });
  useEffect(() => {
    if (campaign)
      form.setValues({
        name: campaign?.name || "",
        type: campaign?.type || CampaignType.WHATSAPP,
        teamId: campaign?.teamId || "",
        surveyTeamMapId: campaign?.surveyTeamMapId || "",
        waTemplateId: campaign?.waTemplateId || "",
        flowId: campaign?.flowId || "",
        dynamicTags: campaign?.dynamicTags || [],
        useUserConsent: campaign?.useUserConsent ?? true,
        whatsappSettingsPhoneId: campaign?.whatsappSettingsPhoneId || "",
      });
  }, [campaign]);

  let dynamicVariableData = ["name", ...(campaign?.contactTags || [])];

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
    console.log("🚀 ~ handleSubmit ~ validation:", validation.errors);
    if (validation.hasErrors) return;
    const flowId =
      templates
        ?.find((t) => t?.id === values?.waTemplateId)
        ?.data?.components?.find((c) => c?.buttons)
        ?.buttons?.find((b) => b?.type === "FLOW")?.flow_id ?? null;
    values.flowId = flowId;
    values.waTemplateId = values.waTemplateId;
    if (values.dynamicTags?.length !== dynamicVariables?.length) {
      values.dynamicTags = values.dynamicTags?.slice(
        0,
        dynamicVariables?.length,
      );
    }
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
  const { translations } = useTranslations();
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
            <Title order={2}>{translations["Create Campaign"]}</Title>
            <TeamSelector
              placeholder={translations["Select Team"]}
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
        <SimpleGrid cols={{ base: 2, lg: isEdit ? 3 : 2 }} p={"lg"}>
          <ContainedTextField
            label={translations["Campaign Name"]}
            placeholder={translations["Enter campaign name"]}
            withAsterisk
            {...form.getInputProps("name")}
            styles={{ label: { fontWeight: "bold", fontSize: 14 } }}
          />
          <ContainedSelection
            label={translations["Choose Template"]}
            withAsterisk
            placeholder={translations["Select Template"]}
            {...form.getInputProps("waTemplateId")}
            readOnly={isEdit && campaign?.status === CampaignStatus.ACTIVE}
            data={templatesData}
            searchable
            styles={{
              input: {
                cursor:
                  isEdit && campaign?.status === CampaignStatus.ACTIVE
                    ? "default"
                    : "pointer",
              },
            }}
          />
          <Group>
            <Tooltip
              label={
                <span style={{ fontSize: "1.2em" }}>
                  {form.values.useUserConsent
                    ? "User consent will be valued"
                    : "User consent will not be considered"}
                </span>
              }
              refProp="rootRef"
            >
              <Switch
                mt={"lg"}
                size="lg"
                {...form.getInputProps("useUserConsent", { type: "checkbox" })}
                label={
                  form.values.useUserConsent
                    ? "Consent valued"
                    : "Consent not considered"
                }
              />
            </Tooltip>
            {isEdit && (
              <Box mt={26}>
                <RateupButtonPrimary
                  loading={updateCampaignMutation.isPending}
                  title={translations["Update"]}
                  disabled={!form.isDirty()}
                  type={"submit"}
                />
              </Box>
            )}
          </Group>
          <AccountSelector {...form.getInputProps("whatsappSettingsPhoneId")} />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 2, lg: 4 }} pl={"lg"}>
          {dynamicVariables?.map((_, i) => (
            <ContainedSelection
              key={i}
              label={`{{${i + 1}}}`}
              data={dynamicVariableData}
              placeholder={translations["select a dynamic tag value"]}
              {...form.getInputProps(`dynamicTags.${i}`)}
            />
          ))}
        </SimpleGrid>
        {!isEdit && (
          <Flex justify={"flex-end"} gap={"md"} mt={"md"}>
            <RateupButtonPrimary
              onClick={close}
              title={translations["Cancel"]}
              variant="outline"
            />
            <RateupButtonPrimary
              title={translations["Create Now"]}
              loading={createCampaignMutation.isPending}
              type={"submit"}
            />
          </Flex>
        )}
      </form>
    </>
  );
};

export default CreateCampaignModal;
