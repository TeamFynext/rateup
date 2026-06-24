import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import TimeZoneSelector from "@/components/common/time-zone-selector.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

import type { BusinessHoursFormValues, DayKey } from "./schema.ts";
import { businessHoursFormSchema, days, timeOptions } from "./schema.ts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: BusinessHoursFormValues;
  onSave: (values: BusinessHoursFormValues) => void;
  editing?: boolean;
};

function TimeSlotRow({
  slot,
  slotIndex,
  day,
  daySchedule,
  slotError,
  handleTimeSlotChange,
  removeTimeSlot,
}) {
  const { t } = useTranslation();
  return (
    <div key={slotIndex} className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Select
          value={slot.openTime}
          onValueChange={(val) => handleTimeSlotChange(day, slotIndex, "openTime", val)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-gray-500 text-sm">{t("To")}</span>

        <Select
          value={slot.closeTime}
          onValueChange={(val) => handleTimeSlotChange(day, slotIndex, "closeTime", val)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {daySchedule.timeSlots.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeTimeSlot(day, slotIndex)}
            className="p-1 h-8 w-8"
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </Button>
        )}
      </div>
      <Separator className="mt-3" />
      {slotError && (
        <p className="text-xs text-red-500">
          {(slotError.openTime || slotError.closeTime)?.message}
        </p>
      )}
    </div>
  );
}

export function BusinessHoursEditorDialog({
  open,
  onOpenChange,
  initialValues,
  onSave,
  editing,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const form = useForm<BusinessHoursFormValues>({
    resolver: zodResolver(businessHoursFormSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [initialValues, form]);

  const getDayName = (day: string) =>
    ({
      sunday: t("Sunday"),
      monday: t("Monday"),
      tuesday: t("Tuesday"),
      wednesday: t("Wednesday"),
      thursday: t("Thursday"),
      friday: t("Friday"),
      saturday: t("Saturday"),
    })[day] || day;

  const handleBusinessHoursChange = (day: DayKey, value: boolean) => {
    const schedule = form.getValues("schedule");
    form.setValue(
      "schedule",
      { ...schedule, [day]: { ...schedule[day], isOpen: value } },
      { shouldValidate: true },
    );
  };

  const handleTimeSlotChange = (
    day: DayKey,
    slotIndex: number,
    field: "openTime" | "closeTime",
    value: string,
  ) => {
    const schedule = form.getValues("schedule");
    const daySchedule = schedule[day];
    const timeSlots = [...daySchedule.timeSlots];
    timeSlots[slotIndex] = { ...timeSlots[slotIndex], [field]: value };
    form.setValue(
      "schedule",
      { ...schedule, [day]: { ...daySchedule, timeSlots } },
      { shouldValidate: true },
    );
  };

  const addTimeSlot = (day: DayKey) => {
    const schedule = form.getValues("schedule");
    const daySchedule = schedule[day];
    form.setValue(
      "schedule",
      {
        ...schedule,
        [day]: {
          ...daySchedule,
          timeSlots: [...daySchedule.timeSlots, { openTime: "09:00", closeTime: "17:30" }],
        },
      },
      { shouldValidate: true },
    );
  };

  const removeTimeSlot = (day: DayKey, slotIndex: number) => {
    const schedule = form.getValues("schedule");
    const daySchedule = schedule[day];
    form.setValue(
      "schedule",
      {
        ...schedule,
        [day]: {
          ...daySchedule,
          timeSlots: daySchedule.timeSlots.filter((_, i) => i !== slotIndex),
        },
      },
      { shouldValidate: true },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-200 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? t("Edit Business Hours") : t("Add Business Hours")}</DialogTitle>
          <DialogDescription>
            {t("Configure your business hours with timezone and channel settings")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 py-4">
          <FieldGroup>
            {/* Name */}
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("Name")} *</FieldLabel>
                  <Input {...field} placeholder={t("e.g. Regular Business Hours")} />
                  <FieldDescription>
                    {t("Give the business hours a recognizable name.")}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {/* Timezone */}
            <Controller
              name="timezone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("Timezone")} *</FieldLabel>
                  <TimeZoneSelector value={field.value} onChange={field.onChange} />
                  <FieldDescription>
                    {t("Select the timezone for your business hours.")}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {/* Channels */}
            {/* TODO: Add this in next iteration */}
            {/* <Controller
              name="channels"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("Channels")}</FieldLabel>
                  <MultiSelect
                    options={availableChannels.map((channel) => ({
                      label: channel,
                      value: channel,
                    }))}
                    {...field}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                  <FieldDescription>
                    {t("Add the channels the business hours relate to.")}
                  </FieldDescription>
                </Field>
              )}
            /> */}
            {/* Description */}
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("Description")}</FieldLabel>
                  <Textarea
                    {...field}
                    rows={2}
                    className="resize-none"
                    placeholder={t("Add a clear description of the business hours.")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {/* Schedule */}
            <Controller
              name="schedule"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("Business hours")}</FieldLabel>
                  <FieldDescription>
                    {t(
                      "Click the toggle to open or close your business for this set of business hours and adjust the times. Time ranges in the same day must not overlap (e.g. 09:00-10:00 and 09:00-12:00 are invalid).",
                    )}
                  </FieldDescription>

                  <div className="mt-4 space-y-4">
                    {days.map((day) => {
                      const daySchedule = field.value[day];
                      const dayErrors =
                        (fieldState.error as any)?.[day]?.timeSlots?.length > 0
                          ? (fieldState.error as any)[day].timeSlots
                          : null;
                      return (
                        <div key={day} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-medium capitalize min-w-25 text-gray-700">
                                {getDayName(day)}
                              </span>
                              <span
                                className={`text-sm px-2 py-1 rounded-full ${
                                  daySchedule.isOpen
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {daySchedule.isOpen ? t("Open") : t("Closed")}
                              </span>
                              <Switch
                                checked={daySchedule.isOpen}
                                onCheckedChange={(checked) =>
                                  handleBusinessHoursChange(day, checked)
                                }
                              />
                            </div>

                            {daySchedule.isOpen && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addTimeSlot(day)}
                                className="gap-1"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {daySchedule.isOpen && (
                            <div className="ml-28 space-y-2">
                              {daySchedule.timeSlots.map((slot: any, slotIndex: number) => (
                                <TimeSlotRow
                                  key={slotIndex + slot?.openTime + slot?.closeTime}
                                  slot={slot}
                                  slotIndex={slotIndex}
                                  day={day}
                                  daySchedule={daySchedule}
                                  slotError={dayErrors?.[slotIndex]}
                                  handleTimeSlotChange={handleTimeSlotChange}
                                  removeTimeSlot={removeTimeSlot}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" className="bg-linear-to-r from-rateup-blue to-rateup-blue">
              {editing ? t("Update Hours") : t("Save Hours")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
