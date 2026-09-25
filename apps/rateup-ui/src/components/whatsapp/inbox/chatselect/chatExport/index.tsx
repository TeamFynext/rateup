import { zodResolver } from "@hookform/resolvers/zod";
import { IconDownload } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import { useExportWaChats } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import useContactStore from "@/store/inbox.store.ts";

const DateType = {
  BETWEEN: "between",
  BEFORE: "before",
  AFTER: "after",
  ON: "on",
} as const;

const chatExportSchema = z
  .object({
    date: z.object({
      type: z.enum(["between", "before", "after", "on"]),
      inclusive: z.boolean(),
      between: z.object({
        from: z.string(),
        to: z.string(),
      }),
      before: z.string(),
      after: z.string(),
      on: z.string(),
    }),
    repliesOnly: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.date.type === "between") {
      if (!val.date.between.from) {
        ctx.addIssue({
          code: "custom",
          message: "From date is required",
          path: ["date", "between", "from"],
        });
      }
      if (!val.date.between.to) {
        ctx.addIssue({
          code: "custom",
          message: "To date is required",
          path: ["date", "between", "to"],
        });
      }
    } else if (val.date.type === "before" && !val.date.before) {
      ctx.addIssue({
        code: "custom",
        message: "Date is required",
        path: ["date", "before"],
      });
    } else if (val.date.type === "after" && !val.date.after) {
      ctx.addIssue({
        code: "custom",
        message: "Date is required",
        path: ["date", "after"],
      });
    } else if (val.date.type === "on" && !val.date.on) {
      ctx.addIssue({
        code: "custom",
        message: "Date is required",
        path: ["date", "on"],
      });
    }
  });

type ChatExportFormValues = z.infer<typeof chatExportSchema>;

export default function WaInboxChatExport() {
  const [chatsExporting, setChatsExporting] = useState(false);
  const exportChats = useExportWaChats();
  const { t: translations } = useTranslation();
  const { filterData } = useContactStore();

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { isValid },
  } = useForm<ChatExportFormValues>({
    resolver: zodResolver(chatExportSchema),
    mode: "onChange",
    defaultValues: {
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
  });

  const dateType = watch("date.type");

  useEffect(() => {
    setValue("date.between.from", "");
    setValue("date.between.to", "");
    setValue("date.before", "");
    setValue("date.after", "");
    setValue("date.on", "");
    setValue("date.inclusive", false);
    setValue("repliesOnly", false);
  }, [dateType, setValue]);

  function onSubmit(values: ChatExportFormValues) {
    setChatsExporting(true);
    toast.loading("Exporting chats...", {
      id: "export-chats",
    });
    exportChats.mutate(
      {
        constraints: encodeURIComponent(JSON.stringify(values)),
        filterData,
      },
      {
        onSettled: () => {
          setChatsExporting(false);
        },
        onError: () => setChatsExporting(false),
      },
    );
  }

  const parseSafeDate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const selectedDateType = watch("date.type");

  const dateField = (
    name: "date.on" | "date.before" | "date.after" | "date.between.from" | "date.between.to",
    label: string,
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field className="flex-1 gap-1.5">
          <FieldTitle className="text-xs">{label}</FieldTitle>
          <DatePicker
            value={parseSafeDate(field.value)}
            onChange={(date) => field.onChange(date ? dayjs(date).format("YYYY-MM-DD") : "")}
            className="h-9 w-full"
          />
        </Field>
      )}
    />
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-80 flex-col gap-4 p-1">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">
          {translations("Export conversations")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {translations("An Excel file of every message in the date range, from all channels.")}
        </p>
      </div>

      <Controller
        name="date.type"
        control={control}
        render={({ field }) => (
          <Field className="gap-1.5">
            <FieldTitle className="text-xs">{translations("Date range")}</FieldTitle>
            <ToggleGroup
              value={[field.value]}
              onValueChange={(value) => value[0] && field.onChange(value[0])}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full"
              aria-label={translations("Date range")}
            >
              {[
                { value: DateType.BETWEEN, label: translations("Between") },
                { value: DateType.ON, label: translations("On") },
                { value: DateType.BEFORE, label: translations("Before") },
                { value: DateType.AFTER, label: translations("After") },
              ].map((option) => (
                <ToggleGroupItem key={option.value} value={option.value} className="flex-1">
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        )}
      />

      <div className="flex gap-2">
        {selectedDateType === DateType.BETWEEN && (
          <>
            {dateField("date.between.from", translations("From"))}
            {dateField("date.between.to", translations("To"))}
          </>
        )}
        {selectedDateType === DateType.ON && dateField("date.on", translations("Date"))}
        {selectedDateType === DateType.BEFORE && dateField("date.before", translations("Date"))}
        {selectedDateType === DateType.AFTER && dateField("date.after", translations("Date"))}
      </div>

      <div className="flex flex-col gap-2.5">
        {(selectedDateType === DateType.BEFORE || selectedDateType === DateType.AFTER) && (
          <Controller
            name="date.inclusive"
            control={control}
            render={({ field }) => (
              <Field orientation="horizontal" className="gap-2">
                <Checkbox
                  id="date-inclusive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel htmlFor="date-inclusive" className="text-sm font-normal">
                  {translations("Include that day")}
                </FieldLabel>
              </Field>
            )}
          />
        )}
        <Controller
          name="repliesOnly"
          control={control}
          render={({ field }) => (
            <Field orientation="horizontal" className="gap-2">
              <Checkbox id="replies-only" checked={field.value} onCheckedChange={field.onChange} />
              <FieldLabel htmlFor="replies-only" className="text-sm font-normal">
                {translations("Only messages from customers")}
              </FieldLabel>
            </Field>
          )}
        />
      </div>

      <Button type="submit" disabled={!isValid} loading={chatsExporting} className="w-full">
        <IconDownload data-icon="inline-start" />
        {translations("Export to Excel")}
      </Button>
    </form>
  );
}
