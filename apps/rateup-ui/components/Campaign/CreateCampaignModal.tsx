import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconInfoCircle,
  IconPlus,
  IconRocket,
  IconSettings,
  IconTemplate,
  IconTrash,
  IconUsers,
  IconWand,
} from "@tabler/icons-react";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import { z } from "zod/v4";

import { CampaignType } from "@/types/enums";
import useTemplatesAvailableForTeam from "@/hooks/team";
import {
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
} from "@/backend/campaign/campaign.query";
import { SAVE_HOTKEY } from "@/utils/constants";

import { RateupButtonPrimary } from "../Button/RateupButtons";
import { AccountSelector } from "../input/AccountSelector";
import {
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
  ContainedTimeInput,
} from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";

interface CreateCampaignProps {
  close: () => void;
  isEdit?: boolean;
  campaign?;
  dynamicVariables?: string[];
  campaignType: CampaignType;
}

const CreateCampaignModal = ({
  close,
  isEdit,
  campaign,
  dynamicVariables,
  campaignType = CampaignType.WHATSAPP,
}: CreateCampaignProps) => {
  const [activeTab, setActiveTab] = useState("basic");
  const translations = useTranslations();

  const schema = z
    .object({
      teamId: z.string().min(1, { message: "Must select a team" }),
      name: z.string().trim().min(1, { message: "Name cannot be empty" }),
      waTemplateId: z.string().optional(),
      type: z.enum(CampaignType),
      surveyTeamMapId: z.string().optional(),
      flowId: z.string().optional(),
      dynamicTags: z.array(z.string().trim().nullable()),
      useUserConsent: z.boolean(),
      whatsappSettingsPhoneId: z.string().min(1),
    })
    .check((ctx) => {
      if (ctx.value.type !== CampaignType.DRIP && !ctx.value.waTemplateId) {
        ctx.issues.push({
          path: ["waTemplateId"],
          code: "custom",
          message: "Must select a template",
          input: "",
        });
      }

      dynamicVariables?.map((_, i) => {
        if (!ctx.value.dynamicTags?.[i]) {
          ctx.issues.push({
            path: [`dynamicTags.${i}`],
            code: "custom",
            message: "Select a tag",
            input: "",
          });
        }
      });
    });

  const form = useForm<z.infer<typeof schema>>({
    initialValues: {
      name: campaign?.name || "",
      type: campaignType,
      teamId: campaign?.teamId || "",
      surveyTeamMapId: campaign?.surveyTeamMapId || "",
      waTemplateId: campaign?.waTemplateId || "",
      flowId: campaign?.flowId || "",
      dynamicTags: campaign?.dynamicTags || [],
      useUserConsent: campaign?.useUserConsent ?? true,
      whatsappSettingsPhoneId: campaign?.whatsappSettingsPhoneId || "",
    },
    validate: zod4Resolver(schema),
  });

  const [dripStages, setDripStages] = useState([
    {
      id: undefined,
      templateId: "",
      delay: 1,
      delayUnit: "days",
      sendAtTime: "09:00",
    },
  ]);

  useEffect(() => {
    if (campaign) {
      form.setValues({
        name: campaign?.name || "",
        type: campaignType,
        teamId: campaign?.teamId || "",
        surveyTeamMapId: campaign?.surveyTeamMapId || "",
        waTemplateId: campaign?.waTemplateId || "",
        flowId: campaign?.flowId || "",
        dynamicTags: campaign?.dynamicTags || [],
        useUserConsent: campaign?.useUserConsent ?? true,
        whatsappSettingsPhoneId: campaign?.whatsappSettingsPhoneId || "",
      });

      if (campaign?.dripStages && campaign.dripStages.length > 0) {
        setDripStages(
          campaign.dripStages.map((stage) => ({
            id: stage.id,
            templateId: stage.waTemplateId || "",
            delay: stage.delay || 1,
            delayUnit: stage.delayUnit || "days",
            sendAtTime: stage.sendAtTime || "09:00",
          })),
        );
      }
    }
  }, [campaign]);

  useEffect(() => {
    if (form.values.type !== CampaignType.DRIP) {
      setDripStages([
        {
          id: undefined,
          templateId: "",
          delay: 1,
          delayUnit: "days",
          sendAtTime: "09:00",
        },
      ]);
    }
  }, [form.values.type]);

  // Memoize handlers to prevent re-renders
  const addDripStage = useCallback(() => {
    setDripStages((prev) => [
      ...prev,
      {
        id: undefined,
        templateId: "",
        delay: 1,
        delayUnit: "days",
        sendAtTime: "09:00",
      },
    ]);
  }, []);

  const removeDripStage = useCallback((idx: number) => {
    setDripStages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateDripStage = useCallback(
    (
      idx: number,
      field: "templateId" | "delay" | "delayUnit" | "sendAtTime",
      value: any,
    ) => {
      setDripStages((prev) =>
        prev.map((stage, i) =>
          i === idx ? { ...stage, [field]: value } : stage,
        ),
      );
    },
    [],
  );

  const templates = useTemplatesAvailableForTeam(form.values.teamId);
  const templatesData = useMemo(
    () =>
      templates?.map((t) => ({
        value: t?.id,
        label: t?.data?.name,
      })) || [],
    [templates],
  );

  const createCampaignMutation = useCreateCampaignMutation(
    form.values.teamId,
    campaignType,
  );
  const updateCampaignMutation = useUpdateCampaignMutation(
    campaign?.id,
    campaign?.teamId,
    () => {},
    campaignType,
  );

  // Memoize form validation to prevent infinite loops
  const isFormValid = useMemo(() => {
    const hasFormErrors = Object.keys(form.errors).length > 0;
    if (form.values.type === CampaignType.DRIP) {
      const hasInvalidStages = dripStages.some((stage) => !stage.templateId);
      return !hasFormErrors && !hasInvalidStages;
    }
    return !hasFormErrors;
  }, [form.errors, form.values.type, dripStages]);

  // Add tab validation functions
  const validateBasicTab = useCallback(() => {
    const basicErrors = [];
    if (!form.values.teamId) basicErrors.push("teamId");
    if (!form.values.name.trim()) basicErrors.push("name");
    if (!form.values.whatsappSettingsPhoneId)
      basicErrors.push("whatsappSettingsPhoneId");
    return basicErrors.length === 0;
  }, [
    form.values.teamId,
    form.values.name,
    form.values.whatsappSettingsPhoneId,
  ]);

  const validateTemplatesTab = useCallback(() => {
    if (form.values.type === CampaignType.DRIP) {
      return dripStages.every((stage) => stage.templateId);
    } else {
      return !!form.values.waTemplateId;
    }
  }, [form.values.type, form.values.waTemplateId, dripStages]);

  const validateSettingsTab = useCallback(() => {
    // Settings tab is always valid as it only has optional configurations
    return true;
  }, []);

  // Check if tab is completed
  const isTabCompleted = useCallback(
    (tab: string) => {
      switch (tab) {
        case "basic":
          return validateBasicTab();
        case "templates":
          return validateTemplatesTab();
        case "settings":
          return validateSettingsTab();
        case "review":
          return (
            validateBasicTab() &&
            validateTemplatesTab() &&
            validateSettingsTab()
          );
        default:
          return false;
      }
    },
    [validateBasicTab, validateTemplatesTab, validateSettingsTab],
  );

  const handleSubmit = useCallback(
    (values) => {
      const validation = form.validate();

      if (values.type === CampaignType.DRIP) {
        const hasInvalidStages = dripStages.some((stage) => !stage.templateId);
        if (hasInvalidStages) {
          return;
        }
      }

      if (validation.hasErrors) return;

      if (values.type !== CampaignType.DRIP) {
        const flowId =
          templates
            ?.find((t) => t?.id === values?.waTemplateId)
            ?.data?.components?.find((c) => c?.buttons)
            ?.buttons?.find((b) => b?.type === "FLOW")?.flow_id ?? null;
        values.flowId = flowId;
      }

      if (values.type === CampaignType.DRIP) {
        // Process drip stages and remove sendAtTime for minute-based delays
        values.dripStages = dripStages.map((stage) => {
          const processedStage = { ...stage };
          if (stage.delayUnit === "minutes") {
            delete processedStage.sendAtTime;
          }
          return processedStage;
        });
        delete values.waTemplateId;
      }

      if (isEdit) {
        updateCampaignMutation.mutate(
          { data: values, campaignId: campaign?.id },
          {
            onSuccess: () => {
              form.reset();
              close();
            },
          },
        );
      } else {
        createCampaignMutation.mutate(values, {
          onSuccess: () => {
            form.reset();
            close();
          },
        });
      }
    },
    [
      dripStages,
      templates,
      isEdit,
      updateCampaignMutation,
      createCampaignMutation,
      campaign?.id,
      form,
      close,
    ],
  );

  // Memoize navigation handler
  const handleNextTab = useCallback(() => {
    const tabs = ["basic", "templates", "settings", "review"];
    const currentIndex = tabs.indexOf(activeTab);

    // Validate current tab before allowing navigation
    if (!isTabCompleted(activeTab)) {
      // Trigger form validation to show errors
      form.validate();
      return;
    }

    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  }, [activeTab, isTabCompleted, form]);

  const renderHeader = () => (
    <Box mb="xl">
      <Group justify="space-between" align="flex-start">
        <Box>
          <Title order={1} size="h2" mb="xs">
            {isEdit
              ? translations("Edit Campaign")
              : translations("Create New Campaign")}
          </Title>
          <Text c="dimmed" size="sm">
            {isEdit
              ? "Update your campaign settings and configuration"
              : "Set up your WhatsApp campaign with templates and automation"}
          </Text>
        </Box>
        <Badge
          size="lg"
          variant="light"
          color={form.values.type === CampaignType.DRIP ? "violet" : "blue"}
          leftSection={
            <ThemeIcon size="xs" variant="transparent">
              {form.values.type === CampaignType.DRIP ? (
                <IconWand size={12} />
              ) : (
                <IconRocket size={12} />
              )}
            </ThemeIcon>
          }
        >
          {form.values.type === CampaignType.DRIP
            ? "Drip Campaign"
            : "WhatsApp Campaign"}
        </Badge>
      </Group>
    </Box>
  );

  const renderBasicInfo = () => (
    <Card withBorder radius="md" p="xl" mb="md">
      <Group mb="lg">
        <ThemeIcon size="lg" variant="light" color="blue">
          <IconUsers size={20} />
        </ThemeIcon>
        <Box>
          <Title order={3}>Campaign Information</Title>
          <Text size="sm" c="dimmed">
            Basic details about your campaign
          </Text>
        </Box>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {!isEdit && (
          <TeamSelector
            label={translations("Select Team")}
            placeholder={translations("Select Team")}
            withAsterisk
            allowDeselect={false}
            {...form.getInputProps("teamId")}
            searchable
          />
        )}

        <ContainedTextField
          label={translations("Campaign Name")}
          placeholder={translations("Enter campaign name")}
          withAsterisk
          {...form.getInputProps("name")}
        />

        <AccountSelector {...form.getInputProps("whatsappSettingsPhoneId")} />
      </SimpleGrid>

      {form.values.type === CampaignType.DRIP && (
        <Alert icon={<IconInfoCircle size={16} />} mt="lg">
          <Text size="sm">
            <strong>Drip campaigns</strong> allow you to send a series of
            messages to contacts over time. Configure your message stages in the
            Templates tab.
          </Text>
        </Alert>
      )}
    </Card>
  );

  const renderTemplateSelection = () => (
    <Card withBorder radius="md" p="xl" mb="md">
      <Group mb="lg">
        <ThemeIcon size="lg" variant="light" color="green">
          <IconTemplate size={20} />
        </ThemeIcon>
        <Box>
          <Title order={3}>
            {form.values.type === CampaignType.DRIP
              ? "Message Stages"
              : "Template Selection"}
          </Title>
          <Text size="sm" c="dimmed">
            {form.values.type === CampaignType.DRIP
              ? "Configure your drip campaign stages"
              : "Choose your WhatsApp message template"}
          </Text>
        </Box>
      </Group>

      {form.values.type === CampaignType.DRIP ? (
        <Box>
          <Group justify="space-between" mb="lg">
            <Text fw={500}>Campaign Stages ({dripStages.length})</Text>
            <Button
              leftSection={<IconPlus size={16} />}
              variant="light"
              onClick={addDripStage}
              size="sm"
            >
              Add Stage
            </Button>
          </Group>

          <ScrollArea.Autosize mah={400} type="scroll">
            <Stack gap="md">
              {dripStages.map((stage, idx) => (
                <Paper key={idx} withBorder p="lg" bg="gray.0" radius="md">
                  <Group justify="space-between" mb="sm">
                    <Group>
                      <Avatar size="sm" color="violet" variant="light">
                        {idx + 1}
                      </Avatar>
                      <Text fw={500}>Stage {idx + 1}</Text>
                    </Group>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => removeDripStage(idx)}
                      disabled={dripStages.length === 1}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>

                  <SimpleGrid
                    cols={{
                      base: 1,
                      sm:
                        stage.delayUnit === "minutes" ||
                        stage.delayUnit === "hours"
                          ? 3
                          : 4,
                    }}
                    spacing="md"
                  >
                    <ContainedSelection
                      label="Template"
                      placeholder="Select template"
                      data={templatesData}
                      value={stage.templateId}
                      onChange={(val) =>
                        updateDripStage(idx, "templateId", val)
                      }
                      withAsterisk
                      error={!stage.templateId ? "Template is required" : null}
                    />
                    <ContainedNumberInput
                      label="Delay"
                      min={1}
                      step={1}
                      allowDecimal={false}
                      value={stage.delay}
                      onChange={(val) => updateDripStage(idx, "delay", val)}
                      leftSection={<IconClock size={16} />}
                    />
                    <ContainedSelection
                      label="Unit"
                      data={[
                        { value: "minutes", label: "Minutes" },
                        { value: "hours", label: "Hours" },
                        { value: "days", label: "Days" },
                        { value: "weeks", label: "Weeks" },
                        { value: "months", label: "Months" },
                      ]}
                      value={stage.delayUnit}
                      onChange={(val) => updateDripStage(idx, "delayUnit", val)}
                      allowDeselect={false}
                    />
                    {(stage.delayUnit === "days" ||
                      stage.delayUnit === "weeks" ||
                      stage.delayUnit === "months") && (
                      <ContainedTimeInput
                        label="Send at time"
                        value={stage.sendAtTime}
                        onChange={(event) =>
                          updateDripStage(
                            idx,
                            "sendAtTime",
                            event.currentTarget.value,
                          )
                        }
                        leftSection={<IconClock size={16} />}
                        // description="24-hour format"
                      />
                    )}
                  </SimpleGrid>
                </Paper>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Box>
      ) : (
        <SimpleGrid cols={1} spacing="lg">
          <ContainedSelection
            label={translations("Choose Template")}
            withAsterisk
            placeholder={translations("Select Template")}
            {...form.getInputProps("waTemplateId")}
            data={templatesData}
            searchable
          />

          {dynamicVariables && dynamicVariables.length > 0 && (
            <Box>
              <Title order={4} mb="md" c="blue">
                Dynamic Variables
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Map dynamic content to your message variables
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {dynamicVariables.map((_, i) => (
                  <ContainedSelection
                    key={i}
                    label={`Variable {{${i + 1}}}`}
                    data={[
                      "name",
                      ...(campaign?.contactTags?.map((tag) => tag.name) || []),
                    ]}
                    placeholder="Select dynamic tag"
                    {...form.getInputProps(`dynamicTags.${i}`)}
                  />
                ))}
              </SimpleGrid>
            </Box>
          )}
        </SimpleGrid>
      )}
    </Card>
  );

  const renderConfiguration = () => (
    <Card withBorder radius="md" p="xl" mb="md">
      <Group mb="lg">
        <ThemeIcon size="lg" variant="light" color="orange">
          <IconSettings size={20} />
        </ThemeIcon>
        <Box>
          <Title order={3}>Campaign Settings</Title>
          <Text size="sm" c="dimmed">
            Configure privacy and consent options
          </Text>
        </Box>
      </Group>

      <Card withBorder p="lg" bg="blue.0" radius="md">
        <Group justify="space-between" align="flex-start">
          <Box flex={1}>
            <Group mb="xs">
              <ThemeIcon size="sm" variant="transparent" color="blue">
                <IconCheck size={16} />
              </ThemeIcon>
              <Text fw={500}>User Consent</Text>
            </Group>
            <Text size="sm" c="dimmed" mb="xs">
              {form.values.useUserConsent
                ? "Only send messages to contacts who have given consent"
                : "Send messages to all contacts regardless of consent status"}
            </Text>
            <Text size="xs" c="blue">
              Recommended: Keep enabled for compliance
            </Text>
          </Box>
          <Switch
            size="lg"
            {...form.getInputProps("useUserConsent", { type: "checkbox" })}
          />
        </Group>
      </Card>
    </Card>
  );

  const renderSummary = () => (
    <Card withBorder radius="md" p="xl" mb="md">
      <Group mb="lg">
        <ThemeIcon size="lg" variant="light" color="teal">
          <IconCheck size={20} />
        </ThemeIcon>
        <Box>
          <Title order={3}>Campaign Summary</Title>
          <Text size="sm" c="dimmed">
            Review your campaign configuration
          </Text>
        </Box>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper withBorder p="md" radius="md">
          <Text fw={500} mb="sm">
            Campaign Details
          </Text>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Name:
              </Text>
              <Text size="sm" fw={500}>
                {form.values.name}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Type:
              </Text>
              <Badge size="sm" variant="light">
                {form.values.type === CampaignType.DRIP
                  ? "Drip Campaign"
                  : "WhatsApp Campaign"}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Template:
              </Text>
              <Text size="sm" fw={500} ta="right">
                {form.values.type === CampaignType.DRIP
                  ? `${dripStages.length} stages`
                  : templatesData?.find(
                      (t) => t.value === form.values.waTemplateId,
                    )?.label}
              </Text>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Text fw={500} mb="sm">
            Settings
          </Text>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                User Consent:
              </Text>
              <Badge
                size="sm"
                color={form.values.useUserConsent ? "teal" : "gray"}
                variant="light"
              >
                {form.values.useUserConsent ? "Enabled" : "Disabled"}
              </Badge>
            </Group>
            {form.values.type === CampaignType.DRIP && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Total Stages:
                </Text>
                <Text size="sm" fw={500}>
                  {dripStages.length}
                </Text>
              </Group>
            )}
          </Stack>
        </Paper>
      </SimpleGrid>

      {form.values.type === CampaignType.DRIP && (
        <Box mt="lg">
          <Text fw={500} mb="sm">
            Stage Timeline
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            {dripStages.map((stage, idx) => (
              <Paper key={idx} withBorder p="sm" radius="sm" bg="violet.0">
                <Group gap="xs" mb="xs">
                  <Avatar size="xs" color="violet">
                    {idx + 1}
                  </Avatar>
                  <Text size="xs" fw={500}>
                    Stage {idx + 1}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {templatesData?.find((t) => t.value === stage.templateId)
                    ?.label || "No template"}
                </Text>
                <Text size="xs" c="violet">
                  {`${stage.delay} ${stage.delayUnit} delay`}
                  {(stage.delayUnit === "days" ||
                    stage.delayUnit === "weeks" ||
                    stage.delayUnit === "months") &&
                    ` at ${stage.sendAtTime}`}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </Card>
  );

  if (isEdit) {
    return (
      <Container size="lg" px="lg" pb={"lg"}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          {renderHeader()}
          <Stack gap="lg">
            {renderBasicInfo()}
            {renderTemplateSelection()}
            {renderConfiguration()}
          </Stack>

          <Group
            justify="flex-end"
            mt="xl"
            pt="lg"
            style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
          >
            <RateupButtonPrimary
              title={translations("Cancel")}
              variant="outline"
              onClick={close}
            />
            <RateupButtonPrimary
              loading={updateCampaignMutation.isPending}
              title={translations("Update Campaign") ?? "Update Campaign"}
              type="submit"
            />
          </Group>
        </form>
      </Container>
    );
  }

  return (
    <Container size="lg" px="lg" pb={"lg"}>
      {renderHeader()}

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        variant="pills"
        radius="md"
      >
        <Tabs.List justify="center" mb="xl">
          <Tabs.Tab value="basic" leftSection={<IconUsers size={16} />}>
            Basic Info
          </Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
            Templates
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
            Settings
          </Tabs.Tab>
          <Tabs.Tab value="review" leftSection={<IconCheck size={16} />}>
            Review
          </Tabs.Tab>
        </Tabs.List>

        <form
          onSubmit={form.onSubmit(handleSubmit)}
          onKeyDown={getHotkeyHandler([
            [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
          ])}
        >
          <Box>
            <Tabs.Panel value="basic">{renderBasicInfo()}</Tabs.Panel>
            <Tabs.Panel value="templates">
              {renderTemplateSelection()}
            </Tabs.Panel>
            <Tabs.Panel value="settings">{renderConfiguration()}</Tabs.Panel>
            <Tabs.Panel value="review">{renderSummary()}</Tabs.Panel>
          </Box>

          <Group
            justify="space-between"
            mt="xl"
            pt="lg"
            style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
          >
            <Group></Group>

            <Group>
              <RateupButtonPrimary
                title={translations("Cancel")}
                variant="outline"
                onClick={close}
              />

              {activeTab === "review" ? (
                <RateupButtonPrimary
                  title={translations("Create Campaign")}
                  loading={createCampaignMutation.isPending}
                  type="submit"
                  disabled={!isFormValid}
                  rightIcon={<IconRocket size={16} />}
                />
              ) : (
                <Button
                  onClick={handleNextTab}
                  rightSection={<IconArrowRight size={16} />}
                  disabled={!isTabCompleted(activeTab)}
                >
                  Next
                </Button>
              )}
            </Group>
          </Group>
        </form>
      </Tabs>
    </Container>
  );
};

export default CreateCampaignModal;
