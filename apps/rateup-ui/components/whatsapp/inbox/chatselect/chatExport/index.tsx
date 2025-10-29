"use client";

import { useState } from "react";

import {
  Button,
  Checkbox,
  Divider,
  Flex,
  Group,
  HoverCard,
  HoverCardDropdown,
  HoverCardTarget,
  Radio,
  RadioGroup,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { DatePicker, DatePickerProps } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import { IconDownload } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import useContactStore from "@/app/dashboard/inbox/store";
import { showLoadingToast } from "@/utils/notifications";

import { useExportWaChats } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import classes from "./styles.module.css";

enum DateType {
  BETWEEN = "between",
  BEFORE = "before",
  AFTER = "after",
  ON = "on",
}
export default function WaInboxChatExport() {
  const [chatsExporting, setChatsExporting] = useState(false);
  const exportChats = useExportWaChats();
  const translations = useTranslations();
  const { filterData } = useContactStore();
  const form = useForm({
    initialValues: {
      date: {
        type: DateType.BETWEEN,
        inclusive: false,
        between: {
          from: "",
          to: "",
        },
        before: "",
        after: "",
        on: "",
      },
      repliesOnly: false,
    },
    onValuesChange(values, previous) {
      if (values.date.type !== previous.date.type) {
        form.setFieldValue("date.between.from", "");
        form.setFieldValue("date.between.to", "");
        form.setFieldValue("date.before", "");
        form.setFieldValue("date.after", "");
        form.setFieldValue("date.on", "");
        form.setFieldValue("date.inclusive", false);
        form.setFieldValue("repliesOnly", false);
      }
    },
    validate(values) {
      const errors = {};
      if (values.date.type === DateType.BETWEEN) {
        if (!values.date.between.from) {
          errors["date.between.from"] = "This field is required";
        }
        if (!values.date.between.to) {
          errors["date.between.to"] = "This field is required";
        }
      }
      if (values.date.type === DateType.BEFORE && !values.date.before) {
        errors["date.before"] = "This field is required";
      }
      if (values.date.type === DateType.AFTER && !values.date.after) {
        errors["date.after"] = "This field is required";
      }
      if (values.date.type === DateType.ON && !values.date.on) {
        errors["date.on"] = "This field is required";
      }
      return Object.keys(errors).length > 0 ? errors : false;
    },
  });
  function handleSubmit(values: typeof form.values) {
    setChatsExporting(true);
    showLoadingToast(
      "Exporting chats...",
      "export-chats",
      true,
      undefined,
      undefined,
      false,
    );
    exportChats.mutate(
      {
        constraints: encodeURIComponent(JSON.stringify(values)),
        filterData,
      },
      {
        onSettled: () => {
          setChatsExporting(false);
        },
        onError: (error) => {
          console.error(error);
          setChatsExporting(false);
        },
      },
    );
  }

  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
      <Stack className={classes.hovercard_dropdown_inner}>
        <Text className={classes.hovercard_title}>
          {translations("Export Whatsapp chats")}
        </Text>
        <Divider />
        <RadioGroup size="xs" {...form.getInputProps("date.type")}>
          <Group>
            <Radio
              label={translations("Between")}
              size="xs"
              value={DateType.BETWEEN}
            />
            <Radio
              label={translations("Before")}
              size="xs"
              value={DateType.BEFORE}
            />
            <Radio
              label={translations("After")}
              size="xs"
              value={DateType.AFTER}
            />
            <Radio label={translations("On")} size="xs" value={DateType.ON} />
          </Group>
        </RadioGroup>
        <Flex justify="center">
          {form.values.date.type === DateType.ON && (
            <CustomDatePicker
              label={translations("on")}
              value={new Date(form.values.date.on)}
              onChange={(value) =>
                form.setFieldValue("date.on", dayjs(value).format("YYYY-MM-DD"))
              }
            />
          )}
          {form.values.date.type === DateType.BEFORE && (
            <CustomDatePicker
              label={translations("before")}
              value={new Date(form.values.date.before)}
              onChange={(value) =>
                form.setFieldValue(
                  "date.before",
                  dayjs(value).format("YYYY-MM-DD"),
                )
              }
            />
          )}
          {form.values.date.type === DateType.AFTER && (
            <CustomDatePicker
              label={translations("after")}
              value={new Date(form.values.date.after)}
              onChange={(value) =>
                form.setFieldValue(
                  "date.after",
                  dayjs(value).format("YYYY-MM-DD"),
                )
              }
            />
          )}
          {form.values.date.type === DateType.BETWEEN && (
            <>
              <CustomDatePicker
                label={translations("from")}
                {...form.getInputProps("date.between.from")}
                value={new Date(form.values.date.between.from)}
                onChange={(value) =>
                  form.setFieldValue(
                    "date.between.from",
                    dayjs(value).format("YYYY-MM-DD"),
                  )
                }
              />
              <CustomDatePicker
                label={translations("to")}
                {...form.getInputProps("date.between.to")}
                value={new Date(form.values.date.between.to)}
                onChange={(value) =>
                  form.setFieldValue(
                    "date.between.to",
                    dayjs(value).format("YYYY-MM-DD"),
                  )
                }
              />
            </>
          )}
        </Flex>
        <Group justify="space-between">
          <Checkbox
            label={translations("Replies Only")}
            size="xs"
            checked={form.values.repliesOnly}
            {...form.getInputProps("repliesOnly")}
          />
          {form.values.date.type !== "between" &&
            form.values.date.type !== "on" && (
              <Checkbox
                label={translations("Inclusive")}
                size="xs"
                checked={form.values.date.inclusive}
                {...form.getInputProps("date.inclusive")}
              />
            )}
          <Button
            type="submit"
            variant="light"
            size="compact-xs"
            leftSection={<IconDownload size={15} />}
            ml={"auto"}
            disabled={chatsExporting || !form.isValid()}
          >
            {translations("Export")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

const CustomDatePicker = (props: DatePickerProps & { label: string }) => {
  const { label, ...others } = props;
  return (
    <Stack className={classes.date_picker_wrapper}>
      <Text size="xs" className={classes.date_picker_label}>
        {label}
      </Text>
      <DatePicker {...others} size="xs" maxDate={new Date()} />
    </Stack>
  );
};
