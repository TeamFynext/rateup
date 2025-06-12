import React, { useEffect } from "react";
import { useRouter } from "next/router";

import {
  Checkbox,
  Group,
  Radio,
  RadioGroup,
  ScrollAreaAutosize,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { z } from "zod/v4";

import { LoyaltyActionType, TemplateType } from "@/types/enums";
import {
  useCreateLoyaltyAction,
  useUpdateLoyaltyAction,
} from "@/backend/loyalty/actions/actions.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import {
  ContainedDateInput,
  ContainedNumberInput,
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";
import WaTextEditor from "@/components/RichTextEditor/waTextEditor";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { FlowSelector } from "@/components/whatsapp/flows/FlowSelector/FlowSelector";
import useTranslations from "@/dictionaries/useTranslation";

import {
  ActionRewadTypes,
  isLPurchaseAction,
  isLReferralAction,
  LoyaltyActionSelect,
  LRSelector,
} from "../utils";

const LoyaltyActionForm = ({
  action,
  existingActionIds,
  isReferralAvailable = true,
  title,
}: {
  action?: any;
  existingActionIds?: string[];
  isReferralAvailable?: boolean;
  title: string;
}) => {
  const createLoyaltyActionMutation = useCreateLoyaltyAction();
  const updateLoyaltyActionMut = useUpdateLoyaltyAction(action?.id);

  const router = useRouter();

  const { translations } = useTranslations();

  const schema = z
    .object({
      type: z
        .string()
        .trim()
        .min(1, { message: translations["Select the action type"] }),
      name: z
        .string()
        .trim()
        .min(1, { message: translations["Name cannot be blank"] }),
      action_id: z
        .string()
        .trim()
        .min(1, { message: translations["Action Id cannot be blank"] })
        .regex(/^[a-zA-Z0-9_]+$/, {
          message:
            translations[
              "Action Id can only have alphanumerics and underscores"
            ],
        }),
      description: z
        .string()
        .trim()
        .min(1, { message: translations["Description required"] }),
      message: z.object({
        message: z.any(),
        forwardMessage: z.any(),
      }),
      rewardId: z.string().optional().nullable(),
      points: z.number(),
      isAmountBased: z.boolean().optional().nullable(),
      amount: z.number().optional().nullable(),
      maxPoints: z.number().optional().nullable(),
      refereeRewardId: z.string().optional().nullable(),
      refereePoints: z.number().optional().nullable(),
      isAmountBasedForReferee: z.boolean().optional().nullable(),
      maxPointsForReferee: z.number().optional().nullable(),
      waTemplateId: z.string().optional().nullable(),
      refereeWaTemplateId: z.string().optional().nullable(),
      startDate: z.date().refine((date) => date !== null, {
        message: translations["Start date cannot be empty"],
      }),
      endDate: z.date().refine((date) => date !== null, {
        message: translations["End date cannot be empty"],
      }),
      isExistingUserReferralAllowed: z.boolean().optional().nullable(),
      actionRewardType: z.nativeEnum(ActionRewadTypes),
      refereeActionRewardType: z.nativeEnum(ActionRewadTypes),
      flowId: z.string().optional().nullable(),
    })
    .check((ctx) => {
      const { value: values } = ctx;
      if (
        !action &&
        values.action_id &&
        existingActionIds.includes(values.action_id)
      ) {
        ctx.issues.push({
          path: ["action_id"],
          code: "custom",
          message: translations["Action Id already taken"],
          input: "",
        });
      }
      if (
        values.actionRewardType === ActionRewadTypes.Point &&
        !values.points
      ) {
        ctx.issues.push({
          path: ["points"],
          code: "custom",
          message: translations["Points should be minimum of one"],
          input: "",
        });
      }
      if (
        isLReferralAction(values.type) &&
        values.refereeActionRewardType === ActionRewadTypes.Point &&
        !values.refereePoints
      ) {
        ctx.issues.push({
          path: ["refereePoints"],
          code: "custom",
          message: translations["Points should be minimum of one"],
          input: "",
        });
      }
      if (values.endDate <= values.startDate) {
        ctx.issues.push({
          path: ["endDate"],
          code: "custom",
          message: translations["End date must be after start date"],
          input: "",
        });
      }
      if (isLReferralAction(values.type)) {
        if (!values.message?.message)
          ctx.issues.push({
            path: ["message.message"],
            code: "custom",
            message: translations["Message cannot be blank"],
            input: "",
          });
        if (!values.message?.forwardMessage) {
          ctx.issues.push({
            path: ["message.forwardMessage"],
            code: "custom",
            message: translations["Forward Message cannot be blank"],
            input: "",
          });
        }
      }
      if (
        values.actionRewardType === ActionRewadTypes.Reward &&
        !values.rewardId.length
      ) {
        ctx.issues.push({
          input: "",
          path: ["rewardId"],
          code: "custom",
          message: translations["Select the reward"],
        });
      }
      if (
        values.refereeActionRewardType === ActionRewadTypes.Reward &&
        !values.refereeRewardId.length
      ) {
        ctx.issues.push({
          path: ["refereeRewardId"],
          code: "custom",
          message: translations["Select the reward"],
          input: "",
        });
      }
    });

  const form = useForm<z.infer<typeof schema>>({
    initialValues: {
      type: "",
      name: "",
      points: 0,
      startDate: null,
      endDate: null,
      waTemplateId: "",
      refereePoints: 0,
      isAmountBased: false,
      amount: 0,
      maxPoints: 0,
      refereeWaTemplateId: "",
      isAmountBasedForReferee: false,
      maxPointsForReferee: 0,
      isExistingUserReferralAllowed: false,
      description: "",
      message: {
        message: "",
        forwardMessage: "",
      },
      rewardId: "",
      refereeRewardId: "",
      action_id: "",
      actionRewardType: ActionRewadTypes.Point,
      refereeActionRewardType: ActionRewadTypes.Point,
      flowId: "",
    },
    validate: zod4Resolver(schema),
  });

  function handleSubmit() {
    if (form.validate().hasErrors) return;
    if (action) {
      const { type, actionRewardType, refereeActionRewardType, ...rest } =
        form.values;
      updateLoyaltyActionMut.mutate(rest, {
        onSuccess: () => {
          form.reset(), router.push("/dashboard/loyalty/actions");
        },
      });
      return;
    }
    const { actionRewardType, refereeActionRewardType, ...rest } = form.values;
    createLoyaltyActionMutation.mutate(rest, {
      onSuccess: () => {
        form.reset(), router.push("/dashboard/loyalty/actions");
      },
    });
  }

  useEffect(() => {
    if (isLReferralAction(form.values.type) && !action) {
      const message = `Please forward the following message to your Friends & Family. For each successful referral you will earn ${form.values.isAmountBased ? `${form.values.points} points per amount of ${form.values.amount}` : `${form.values.points} points`}`;
      const forwardMessage = `I would like to invite you to *[Your Organization Name]*. Using the following code, You will get ${form.values.isAmountBasedForReferee ? `${form.values.refereePoints} points per amount of ${form.values.amount}` : `${form.values.refereePoints} points`}.
          \n code: *{{code}}*`;
      form.setFieldValue("message", {
        message,
        forwardMessage,
      });
    }
    if (action) {
      form.setInitialValues({
        ...action,
        startDate: new Date(action?.startDate),
        endDate: new Date(action?.endDate),
        description: action?.description || "",
        message: action?.message || {
          message: "",
          forwardMessage: "",
        },
        action_id: action?.action_id || "",
        actionRewardType: action?.rewardId
          ? ActionRewadTypes.Reward
          : ActionRewadTypes.Point,
        refereeActionRewardType: action?.refereeRewardId
          ? ActionRewadTypes.Reward
          : ActionRewadTypes.Point,
        flowId: action?.flowId || "",
      });
      form.setValues({
        ...action,
        startDate: new Date(action?.startDate),
        endDate: new Date(action?.endDate),
        description: action?.description || "",
        message: action?.message || {
          message: "",
          forwardMessage: "",
        },
        action_id: action?.action_id || "",
        actionRewardType: action?.rewardId
          ? ActionRewadTypes.Reward
          : ActionRewadTypes.Point,
        refereeActionRewardType: action?.refereeRewardId
          ? ActionRewadTypes.Reward
          : ActionRewadTypes.Point,
        flowId: action?.flowId || "",
      });
    }
  }, [action, form.values.type]);
  console.log(action);

  useEffect(() => {
    if (
      !action &&
      form.values.action_id &&
      existingActionIds.includes(form.values.action_id)
    ) {
      form.setFieldError("action_id", translations["Action Id already taken"]);
    }
  }, [form.values.action_id]);

  return (
    <Stack p={"xs"} h={"95vh"}>
      <Group justify="space-between">
        <Title order={3}>{title}</Title>
        <Group>
          <RateupButtonSecondary
            title={translations["Cancel"]}
            onClick={() => {
              form.reset();
              router.push("/dashboard/loyalty/actions");
            }}
          />
          <RateupButtonPrimary
            title="Save"
            onClick={handleSubmit}
            loading={createLoyaltyActionMutation.isPending}
          />
        </Group>
      </Group>
      <PaperLayout flex={1}>
        <ScrollAreaAutosize>
          <Stack>
            <SimpleGrid cols={2}>
              <LoyaltyActionSelect
                onChange={(value) => form.setFieldValue("type", value)}
                value={form.values.type}
                disabled={!!action}
                isReferralAvailable={isReferralAvailable}
              />
              <ContainedTextField
                label={translations["Action Id"]}
                {...form.getInputProps("action_id")}
                disabled={action && action.action_id?.length}
              />
              <ContainedTextField
                label={translations["Name"]}
                {...form.getInputProps("name")}
              />
              <Group>
                <ContainedDateInput
                  label={translations["Start Date"]}
                  {...form.getInputProps("startDate")}
                />{" "}
                -
                <ContainedDateInput
                  label={translations["End Date"]}
                  {...form.getInputProps("endDate")}
                />
              </Group>
              <ContainedTextArea
                label={translations["Description"]}
                {...form.getInputProps("description")}
                autosize
                minRows={3}
              />
              {LoyaltyActionType.FeedBack && (
                // <WaTemplateSelector {...form.getInputProps("flowId")} />
                <FlowSelector
                  onlyPublished
                  id={"dbFlowId"}
                  {...form.getInputProps("flowId")}
                  searchable
                  comboboxProps={{ position: "top" }}
                  allowDeselect={true}
                />
              )}
              <Group>
                <Stack>
                  <Checkbox
                    label={
                      isLReferralAction(form.values.type)
                        ? translations["Amount Based"] +
                          translations["for referrer"]
                        : translations["Amount Based"]
                    }
                    {...form.getInputProps("isAmountBased")}
                    checked={form.values.isAmountBased}
                    display={
                      isLPurchaseAction(form.values.type) ? "block" : "none"
                    }
                  />
                  <Checkbox
                    label={
                      translations["Amount Based"] + translations["for friends"]
                    }
                    {...form.getInputProps("isAmountBasedForReferee")}
                    checked={form.values.isAmountBasedForReferee}
                    display={
                      isLPurchaseAction(form.values.type) &&
                      isLReferralAction(form.values.type)
                        ? "block"
                        : "none"
                    }
                  />
                </Stack>
                <ContainedNumberInput
                  label={translations["Amount"]}
                  {...form.getInputProps("amount")}
                  allowNegative={false}
                  display={
                    (isLPurchaseAction(form.values.type) &&
                      form.values.isAmountBased) ||
                    form.values.isAmountBasedForReferee
                      ? "block"
                      : "none"
                  }
                />
              </Group>
            </SimpleGrid>
            <SimpleGrid cols={2}>
              <PaperLayout bg={"var(--grey-color-5)"} h={350}>
                <Stack>
                  {isLReferralAction(form.values.type) && (
                    <Text size="sm" fw="bold">
                      Referrer
                    </Text>
                  )}
                  <RadioGroup {...form.getInputProps("actionRewardType")}>
                    <Group>
                      {Object.values(ActionRewadTypes).map((type) => (
                        <Radio value={type} label={type} key={type} />
                      ))}
                    </Group>
                  </RadioGroup>
                  {form.values.actionRewardType === ActionRewadTypes.Reward ? (
                    <LRSelector
                      {...form.getInputProps("rewardId")}
                      label={translations["Reward"]}
                    />
                  ) : (
                    <>
                      <ContainedNumberInput
                        label={
                          form.values.isAmountBased
                            ? translations["Points per amount"]
                            : translations["Points"]
                        }
                        {...form.getInputProps("points")}
                        allowDecimal={false}
                        allowNegative={false}
                      />
                      <ContainedNumberInput
                        label={translations["Max Points Per Transaction"]}
                        {...form.getInputProps("maxPoints")}
                        allowDecimal={false}
                        allowNegative={false}
                        display={form.values.isAmountBased ? "block" : "none"}
                      />
                    </>
                  )}
                  <WaTemplateSelector
                    templateType={TemplateType.LOYALTY}
                    label={
                      isLReferralAction(form.values.type)
                        ? translations["whatsApp Template"] +
                          translations["for referrer"] +
                          translations["(to send after action)"]
                        : translations["whatsApp Template"] +
                          translations["(to send after action)"]
                    }
                    description={`Dynamic variable {{1}} - ${translations["customer name"]}, {{2}} - 
                      ${translations["current earned points"]} ${isLReferralAction(form.values.type) ? `,{{3}} - ${translations["Friend name"]}, {{4}} - ${translations["Friend phone number"]}` : ""} `}
                    {...form.getInputProps("waTemplateId")}
                  />
                </Stack>
              </PaperLayout>
              <Stack>
                {isLReferralAction(form.values.type) && (
                  <PaperLayout bg={"var(--grey-color-5)"} h={350}>
                    <Stack>
                      <Text size="sm" fw="bold">
                        Friends
                      </Text>

                      <RadioGroup
                        {...form.getInputProps("refereeActionRewardType")}
                      >
                        <Group>
                          {Object.values(ActionRewadTypes).map((type) => (
                            <Radio value={type} label={type} key={type} />
                          ))}
                        </Group>
                      </RadioGroup>
                      {form.values.refereeActionRewardType ===
                      ActionRewadTypes.Reward ? (
                        <LRSelector
                          {...form.getInputProps("refereeRewardId")}
                          label={translations["Reward"]}
                        />
                      ) : (
                        <>
                          <ContainedNumberInput
                            label={translations["Points"]}
                            {...form.getInputProps("refereePoints")}
                            allowDecimal={false}
                            allowNegative={false}
                          />
                          <ContainedNumberInput
                            label={translations["Max Points Per Transaction"]}
                            {...form.getInputProps("maxPointsForReferee")}
                            allowDecimal={false}
                            allowNegative={false}
                            display={
                              isLPurchaseAction(form.values.type) &&
                              form.values.isAmountBasedForReferee
                                ? "block"
                                : "none"
                            }
                          />
                        </>
                      )}
                      <Checkbox
                        label={
                          translations["Referral allowed for existing customer"]
                        }
                        {...form.getInputProps("isExistingUserReferralAllowed")}
                        checked={form.values.isExistingUserReferralAllowed}
                      />
                      <WaTemplateSelector
                        templateType={TemplateType.LOYALTY}
                        label={
                          translations["whatsApp Template"] +
                          translations["for friends"] +
                          translations["(to send after action)"]
                        }
                        description={`Dynamic variable {{1}} - ${translations["customer name"]}, {{2}} - ${translations["current earned points"]}`}
                        {...form.getInputProps("refereeWaTemplateId")}
                      />
                    </Stack>
                  </PaperLayout>
                )}
              </Stack>
            </SimpleGrid>

            {isLReferralAction(form.values.type) && (
              <SimpleGrid cols={2}>
                <Stack gap={0}>
                  <Text size="sm">{translations["Referral Message"]}</Text>
                  <Text size="xs" c={"dimmed"}>
                    {
                      translations[
                        "Used in whatsapp message to send for referral"
                      ]
                    }
                  </Text>
                  <WaTextEditor
                    handleInputChange={(value) => {
                      form.setFieldValue("message.message", value.content);
                    }}
                    content={form.values.message.message}
                    mah={120}
                  />
                </Stack>
                <Stack gap={0}>
                  <Text size="sm">
                    {
                      translations[
                        "Referral forwarding Message with referral code"
                      ]
                    }
                  </Text>
                  <Text size="xs" c={"dimmed"}>
                    {translations[
                      "Used in whatsapp message for forwarding to friends"
                    ] +
                      translations[
                        "Use {{code}} to replace with referral code"
                      ]}
                  </Text>
                  <WaTextEditor
                    handleInputChange={(value) => {
                      form.setFieldValue(
                        "message.forwardMessage",
                        value.content,
                      );
                    }}
                    content={form.values.message.forwardMessage}
                    mah={120}
                  />
                </Stack>
              </SimpleGrid>
            )}
          </Stack>
        </ScrollAreaAutosize>
      </PaperLayout>
    </Stack>
  );
};

export default LoyaltyActionForm;
