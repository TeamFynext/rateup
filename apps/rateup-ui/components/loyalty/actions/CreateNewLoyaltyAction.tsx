import React, { useEffect, useState } from "react";

import {
  Box,
  Button,
  Combobox,
  Group,
  Input,
  InputBase,
  rgba,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import {
  IconFriends,
  IconShoppingCart,
  IconUserFilled,
} from "@tabler/icons-react";
import { z } from "zod";

import { LoyaltyActionType } from "@/types/enums";
import {
  useCreateLoyaltyAction,
  useUpdateLoyaltyAction,
} from "@/backend/loyalty/actions/actions.query";
import {
  ContainedDateInput,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";
import FormModalLayout from "@/components/Modal/FormModalLayout";

import classes from "./Actions.module.css";

const isLReferralAction = (actionType) =>
  [LoyaltyActionType.ReferFriend, LoyaltyActionType.ReferralPurchase].includes(
    actionType,
  );

const CreateNewLoyaltyAction = ({ opened, close, action = null }) => {
  const createLoyaltyActionMutation = useCreateLoyaltyAction();
  const updateLoyaltyActionMut = useUpdateLoyaltyAction(action?.id);

  const schema = z
    .object({
      type: z.string().trim().min(1, { message: "Select the action type" }),
      name: z.string().trim().min(1, { message: "Name cannot be empty" }),
      points: z
        .number()
        .min(1, { message: "Points should be minimum of zero" }),
      startDate: z.date().refine((date) => date !== null, {
        message: "Start date cannot be empty",
      }),
      endDate: z.date().refine((date) => date !== null, {
        message: "End date cannot be empty",
      }),
      waTemplateId: z.string(),
      refereePoints: z
        .number()
        .min(1, { message: "Points should be minimum of zero" }),
    })
    .superRefine((values, ctx) => {
      if (values.endDate <= values.startDate) {
        ctx.addIssue({
          path: ["endDate"],
          code: z.ZodIssueCode.custom,
          message: "End date must be after start date",
        });
      }
    });
  const form = useForm<z.infer<typeof schema>>({
    initialValues: {
      type: action?.type || "",
      name: action?.name || "",
      points: action?.points || 0,
      startDate: action?.startDate || null,
      endDate: action?.endDate || null,
      waTemplateId: action?.waTemplateId || null,
      refereePoints: action?.refereePoints || 0,
    },
    validate: zodResolver(schema),
  });

  function handleSubmit() {
    if (form.validate().hasErrors) return;
    if (action) {
      const { type, ...rest } = form.values;
      updateLoyaltyActionMut.mutate(rest, {
        onSuccess: () => {
          form.reset(), close();
        },
      });
      return;
    }
    createLoyaltyActionMutation.mutate(form.values, {
      onSuccess: () => {
        form.reset(), close();
      },
    });
  }

  useEffect(() => {
    if (action) {
      form.setInitialValues({
        ...action,
        startDate: new Date(action?.startDate),
        endDate: new Date(action?.endDate),
      });
      form.setValues({
        ...action,
        startDate: new Date(action?.startDate),
        endDate: new Date(action?.endDate),
      });
    }
  }, [action]);

  return (
    <FormModalLayout
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title={action ? "Edit action" : "Create a New Action"}
      centered
      includeCancelButton
      buttonTitle={action ? "Update" : "Create"}
      onSubmit={form.onSubmit(handleSubmit)}
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      size={"500px"}
      isLoading={createLoyaltyActionMutation.isPending}
    >
      <Stack>
        <LoyaltyActionSelect
          onChange={(value) => form.setFieldValue("type", value)}
          value={form.values.type}
          disabled={!!action}
        />
        <ContainedTextField label={"Name"} {...form.getInputProps("name")} />
        <ContainedNumberInput
          label={"Points"}
          {...form.getInputProps("points")}
          allowDecimal={false}
          allowNegative={false}
        />
        <ContainedNumberInput
          label={"Points for referee"}
          {...form.getInputProps("refereePoints")}
          allowDecimal={false}
          allowNegative={false}
          display={isLReferralAction(form.values.type) ? "block" : "none"}
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
        <WaTemplateSelector
          label="WhatsApp Template(to send after action)"
          {...form.getInputProps("waTemplateId")}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default CreateNewLoyaltyAction;

const LoyaltyActionSelect = ({ onChange, value, disabled }) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  function getActionIcon(type, color?) {
    switch (type) {
      case LoyaltyActionType.ReferFriend:
        return (
          <IconFriends
            size={"1.2rem"}
            color={color ?? "var(--mantine-color-gray-7)"}
          />
        );
      case LoyaltyActionType.ReferralPurchase:
        return (
          <Box style={{ position: "relative", display: "inline-block" }}>
            <IconShoppingCart
              size={"1.2rem"}
              color={color ?? "var(--mantine-color-gray-7)"}
            />
            <IconUserFilled
              size={"0.7rem"}
              color="white"
              style={{
                backgroundColor: color ?? "var(--mantine-color-gray-7)",
              }}
              className={classes["icon-user"]}
            />
          </Box>
        );
      case LoyaltyActionType.DirectPurchase:
        return (
          <IconShoppingCart
            size={"1.2rem"}
            color={color ?? "var(--mantine-color-gray-7)"}
          />
        );
    }
  }
  const options = Object.values(LoyaltyActionType).map((type) => (
    <Combobox.Option value={type} key={type}>
      <Group>
        {getActionIcon(type)}
        <Text size={"sm"}>{type}</Text>
      </Group>
    </Combobox.Option>
  ));
  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron c={"var(--tertiary-color)"} />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
          radius={"md"}
          leftSection={getActionIcon(value, "var(--tertiary-color)")}
          classNames={{ input: classes["input"] }}
          disabled={disabled}
          label={"Select Action"}
        >
          {value || <Input.Placeholder>Select action</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
