import React, { useEffect } from "react";
import { useRouter } from "next/router";

import {
  Checkbox,
  Group,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";

import { TemplateType } from "@/types/enums";
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
      type: z.string().trim().min(1, { message: "Select the action type" }),
      name: z.string().trim().min(1, { message: "Name cannot be blank" }),
      action_id: z
        .string()
        .trim()
        .min(1, { message: "Action Id cannot be blank" })
        .regex(/^[a-zA-Z0-9_]+$/, {
          message: "Action Id can only have alphanumerics and underscores",
        }),
      description: z
        .string()
        .trim()
        .min(1, { message: "Description required" }),
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
        message: "Start date cannot be empty",
      }),
      endDate: z.date().refine((date) => date !== null, {
        message: "End date cannot be empty",
      }),
      isExistingUserReferralAllowed: z.boolean().optional().nullable(),
      actionRewardType: z.nativeEnum(ActionRewadTypes),
      refereeActionRewardType: z.nativeEnum(ActionRewadTypes),
    })
    .superRefine((values, ctx) => {
      if (
        !action &&
        values.action_id &&
        existingActionIds.includes(form.values.action_id)
      ) {
        ctx.addIssue({
          path: ["action_id"],
          code: z.ZodIssueCode.custom,
          message: "Action Id already taken",
        });
      }
      if (
        values.actionRewardType === ActionRewadTypes.Point &&
        !values.points
      ) {
        ctx.addIssue({
          path: ["points"],
          code: z.ZodIssueCode.custom,
          message: "Points should be minimum of one",
        });
      }
      if (
        isLReferralAction(values.type) &&
        values.refereeActionRewardType === ActionRewadTypes.Point &&
        !values.refereePoints
      ) {
        ctx.addIssue({
          path: ["refereePoints"],
          code: z.ZodIssueCode.custom,
          message: "Points should be minimum of one",
        });
      }
      if (values.endDate <= values.startDate) {
        ctx.addIssue({
          path: ["endDate"],
          code: z.ZodIssueCode.custom,
          message: "End date must be after start date",
        });
      }
      if (isLReferralAction(values.type)) {
        if (!values.message?.message)
          ctx.addIssue({
            path: ["message.message"],
            code: z.ZodIssueCode.custom,
            message: "Message cannot be blank",
          });
        if (!values.message?.forwardMessage) {
          ctx.addIssue({
            path: ["message.forwardMessage"],
            code: z.ZodIssueCode.custom,
            message: "Forward Message cannot be blank",
          });
        }
      }
      if (
        values.actionRewardType === ActionRewadTypes.Reward &&
        !values.rewardId.length
      ) {
        ctx.addIssue({
          path: ["rewardId"],
          code: z.ZodIssueCode.custom,
          message: "Select the reward",
        });
      }
      if (
        values.refereeActionRewardType === ActionRewadTypes.Reward &&
        !values.refereeRewardId.length
      ) {
        ctx.addIssue({
          path: ["refereeRewardId"],
          code: z.ZodIssueCode.custom,
          message: "Select the reward",
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
    },
    validate: zodResolver(schema),
  });

  function handleSubmit() {
    console.log("form.validate()", form.validate());
    if (form.validate().hasErrors) return;
    if (action) {
      const { type, actionRewardType, refereeActionRewardType, ...rest } =
        form.values;
      updateLoyaltyActionMut.mutate(rest, {
        onSuccess: () => {
          form.reset(), router.push("/dashboard/loyalty/actions");
          // close();
        },
      });
      return;
    }
    const { actionRewardType, refereeActionRewardType, ...rest } = form.values;
    createLoyaltyActionMutation.mutate(rest, {
      onSuccess: () => {
        form.reset(), router.push("/dashboard/loyalty/actions");
        // close();
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
      });
    }
  }, [action, form.values.type]);

  useEffect(() => {
    if (
      !action &&
      form.values.action_id &&
      existingActionIds.includes(form.values.action_id)
    ) {
      form.setFieldError("action_id", "Action Id already taken");
    }
  }, [form.values.action_id]);

  return (
    <Stack>
      <Group justify="space-between">
        <Title>{title}</Title>
        <Group>
          <RateupButtonSecondary
            title={"Cancel"}
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
      <PaperLayout>
        <Stack>
          <SimpleGrid cols={2}>
            <LoyaltyActionSelect
              onChange={(value) => form.setFieldValue("type", value)}
              value={form.values.type}
              disabled={!!action}
              isReferralAvailable={isReferralAvailable}
            />
            <ContainedTextField
              label={"Action Id"}
              {...form.getInputProps("action_id")}
              disabled={action && action.action_id?.length}
            />
            <ContainedTextField
              label={"Name"}
              {...form.getInputProps("name")}
            />
            <Group>
              <ContainedDateInput
                label={"Start Date"}
                {...form.getInputProps("startDate")}
              />{" "}
              -
              <ContainedDateInput
                label={"End Date"}
                {...form.getInputProps("endDate")}
              />
            </Group>
            <ContainedTextArea
              label={translations["Description"]}
              {...form.getInputProps("description")}
              autosize
              minRows={3}
            />
            <Group>
              <Stack>
                <Checkbox
                  label={
                    isLReferralAction(form.values.type)
                      ? "Amount Based for Referrer"
                      : "Amount Based"
                  }
                  {...form.getInputProps("isAmountBased")}
                  checked={form.values.isAmountBased}
                  display={
                    isLPurchaseAction(form.values.type) ? "block" : "none"
                  }
                />
                <Checkbox
                  label={"Amount Based for Friends"}
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
                label={"Amount"}
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
                    label="Reward"
                  />
                ) : (
                  <>
                    <ContainedNumberInput
                      label={
                        form.values.isAmountBased
                          ? "Points per amount"
                          : "Points"
                      }
                      {...form.getInputProps("points")}
                      allowDecimal={false}
                      allowNegative={false}
                    />
                    <ContainedNumberInput
                      label={"Max Points Per Transaction"}
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
                      ? "WhatsApp Template for referrer(to send after action)"
                      : "WhatsApp Template(to send after action)"
                  }
                  description={`Dynamic variable {{1}} - customer name, {{2}} - 
                      current earned points ${isLReferralAction(form.values.type) ? " ,{{3}} - Friend name, {{4}} - Friend phone number" : ""} `}
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
                        label={"Reward"}
                      />
                    ) : (
                      <>
                        <ContainedNumberInput
                          label={"Points"}
                          {...form.getInputProps("refereePoints")}
                          allowDecimal={false}
                          allowNegative={false}
                        />
                        <ContainedNumberInput
                          label={"Max Points Per Transaction"}
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
                      label={"Referral allowed for existing customer"}
                      {...form.getInputProps("isExistingUserReferralAllowed")}
                      checked={form.values.isExistingUserReferralAllowed}
                    />
                    <WaTemplateSelector
                      templateType={TemplateType.LOYALTY}
                      label="WhatsApp Template for friends(to send after action)"
                      description="Dynamic variable {{1}} - customer name, {{2}} - current earned points"
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
                <Text size="sm">Referral Message</Text>
                <Text size="xs" c={"dimmed"}>
                  Used in whatsapp message to send for referral
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
                  Referral forwarding Message with referral code
                </Text>
                <Text
                  size="xs"
                  c={"dimmed"}
                >{`Used in whatsapp message for forwarding to friends. Use {{code}} to replace with referral code`}</Text>
                <WaTextEditor
                  handleInputChange={(value) => {
                    console.log("cc f", value);
                    form.setFieldValue("message.forwardMessage", value.content);
                  }}
                  content={form.values.message.forwardMessage}
                  mah={120}
                />
              </Stack>
            </SimpleGrid>
          )}
        </Stack>
      </PaperLayout>
    </Stack>
  );
};

export default LoyaltyActionForm;
