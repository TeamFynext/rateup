import { zodResolver } from "@hookform/resolvers/zod";
import { IconDownload } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import { useExportWaChats } from "@/backend/whatsapp/inbox/message/wamessage.query";
import useContactStore from "@/components/dashboard/inbox/store.ts";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import { Field, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Separator } from "@/components/ui/separator.tsx";

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
        onError: (error) => {
          console.error(error);
          setChatsExporting(false);
        },
      },
    );
  }

  const parseSafeDate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const selectedDateType = watch("date.type");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-3 p-3 min-w-[320px] bg-background">
        <h3 className="text-sm font-semibold text-foreground">
          {translations("Export Whatsapp chats")}
        </h3>
        <Separator />

        <Controller
          name="date.type"
          control={control}
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label" className="sr-only">
                {translations("Date range")}
              </FieldLegend>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-row gap-3 items-center"
              >
                {[
                  { value: DateType.BETWEEN, id: "date-between", label: translations("Between") },
                  { value: DateType.BEFORE, id: "date-before", label: translations("Before") },
                  { value: DateType.AFTER, id: "date-after", label: translations("After") },
                  { value: DateType.ON, id: "date-on", label: translations("On") },
                ].map((option) => (
                  <Field key={option.id} orientation="horizontal" className="w-auto gap-1.5">
                    <RadioGroupItem value={option.value} id={option.id} />
                    <FieldLabel
                      htmlFor={option.id}
                      className="text-xs font-normal text-muted-foreground"
                    >
                      {option.label}
                    </FieldLabel>
                  </Field>
                ))}
              </RadioGroup>
            </FieldSet>
          )}
        />

        <div className="flex justify-center gap-3">
          {selectedDateType === DateType.ON && (
            <Controller
              name="date.on"
              control={control}
              render={({ field }) => (
                <CustomDatePicker
                  label={translations("on")}
                  value={parseSafeDate(field.value)}
                  onChange={(date) => field.onChange(dayjs(date).format("YYYY-MM-DD"))}
                />
              )}
            />
          )}
          {selectedDateType === DateType.BEFORE && (
            <Controller
              name="date.before"
              control={control}
              render={({ field }) => (
                <CustomDatePicker
                  label={translations("before")}
                  value={parseSafeDate(field.value)}
                  onChange={(date) => field.onChange(dayjs(date).format("YYYY-MM-DD"))}
                />
              )}
            />
          )}
          {selectedDateType === DateType.AFTER && (
            <Controller
              name="date.after"
              control={control}
              render={({ field }) => (
                <CustomDatePicker
                  label={translations("after")}
                  value={parseSafeDate(field.value)}
                  onChange={(date) => field.onChange(dayjs(date).format("YYYY-MM-DD"))}
                />
              )}
            />
          )}
          {selectedDateType === DateType.BETWEEN && (
            <>
              <Controller
                name="date.between.from"
                control={control}
                render={({ field }) => (
                  <CustomDatePicker
                    label={translations("from")}
                    value={parseSafeDate(field.value)}
                    onChange={(date) => field.onChange(dayjs(date).format("YYYY-MM-DD"))}
                  />
                )}
              />
              <Controller
                name="date.between.to"
                control={control}
                render={({ field }) => (
                  <CustomDatePicker
                    label={translations("to")}
                    value={parseSafeDate(field.value)}
                    onChange={(date) => field.onChange(dayjs(date).format("YYYY-MM-DD"))}
                  />
                )}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-4">
            <Controller
              name="repliesOnly"
              control={control}
              render={({ field }) => (
                <Field orientation="horizontal" className="w-auto gap-1.5">
                  <Checkbox
                    id="replies-only"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel
                    htmlFor="replies-only"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {translations("Replies Only")}
                  </FieldLabel>
                </Field>
              )}
            />
            {selectedDateType !== "between" && selectedDateType !== "on" && (
              <Controller
                name="date.inclusive"
                control={control}
                render={({ field }) => (
                  <Field orientation="horizontal" className="w-auto gap-1.5">
                    <Checkbox
                      id="date-inclusive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <FieldLabel
                      htmlFor="date-inclusive"
                      className="text-xs font-normal text-muted-foreground"
                    >
                      {translations("Inclusive")}
                    </FieldLabel>
                  </Field>
                )}
              />
            )}
          </div>

          <Button
            type="submit"
            size="sm"
            className="h-8 text-xs ml-auto flex items-center gap-1.5"
            disabled={chatsExporting || !isValid}
          >
            <IconDownload size={15} />
            {translations("Export")}
          </Button>
        </div>
      </div>
    </form>
  );
}

const CustomDatePicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
}) => {
  return (
    <Field className="gap-1 p-2 border rounded-lg bg-card max-w-[140px] flex-1">
      <FieldTitle className="capitalize text-[10px] font-semibold text-primary">{label}</FieldTitle>
      <DatePicker value={value} onChange={onChange} className="h-7 w-full text-[11px]" />
    </Field>
  );
};
