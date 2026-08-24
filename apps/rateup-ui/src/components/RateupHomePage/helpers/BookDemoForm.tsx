import { useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import { useBookDemoMutation } from "@/backend/bookdemo/bookdemo.query";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Half-hour slots across a working day, kept as `HH:mm` so the payload stays locale-free. */
const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
  const minutesFromNine = 9 * 60 + i * 30;
  const hour = Math.floor(minutesFromNine / 60);
  const minute = minutesFromNine % 60;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const suffix = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return { value, label: `${hour12}:${String(minute).padStart(2, "0")} ${suffix}` };
});

/** Sentinel for "no preference": Base UI's `Select` has no empty-string item, and the field is optional. */
const ANY_TIME = "__any__";
const TIME_ITEMS = [{ value: ANY_TIME, label: "No preference" }, ...TIME_SLOTS];

/** `YYYY-MM-DD` in the visitor's own timezone. `toISOString()` would shift the day for anyone
 *  east or west of UTC at the wrong hour, which is how a "tomorrow" pick becomes today. */
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

/** The inverse, parsed as a local date for the same reason. */
const fromDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
};

interface BookDemoFormProps {
  /** Ids are prefixed with this so a page and a dialog can both be mounted without colliding labels. */
  idPrefix?: string;
  /** Fired after the request is accepted — the modal uses it to close itself. */
  onSuccess?: () => void;
  className?: string;
}

/** The demo-request form itself, shared by the dialog (`BookDemoComponent`) and the `/book-a-demo` page. */
export default function BookDemoForm({
  idPrefix = "demo",
  onSuccess,
  className,
}: BookDemoFormProps) {
  const { mutate, isPending } = useBookDemoMutation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    businessName: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bookable window: today through a year out. Midnight-anchored so "today" itself stays pickable.
  const today = new Date();
  const firstBookableDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const lastBookableDay = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const minDate = toDateKey(firstBookableDay);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }
    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = "Invalid phone number";
    }
    if (formData.preferredDate && formData.preferredDate < minDate) {
      newErrors.preferredDate = "Preferred date can't be in the past";
    }
    if (formData.preferredTime && !formData.preferredDate) {
      newErrors.preferredDate = "Pick a preferred date for that time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      Object.values(errors).forEach((error) => {
        if (error) toast.error(error);
      });
      return;
    }

    const payload = {
      name: formData.name.split(" ")[0].trim(),
      workEmail: formData.email.trim(),
      phone: formData.phone.trim(),
      businessName: formData.businessName.trim(),
      preferredDate: formData.preferredDate || undefined,
      preferredTime: formData.preferredTime || undefined,
      message: formData.message.trim(),
    };

    mutate(payload, {
      onSuccess: () => {
        toast.success("Demo request submitted successfully!");
        setFormData({
          name: "",
          email: "",
          businessName: "",
          phone: "",
          preferredDate: "",
          preferredTime: "",
          message: "",
        });
        onSuccess?.();
      },
      onError: (err) => {
        console.error("Demo booking failed:", err);
        toast.error("Failed to submit demo request. Please try again.");
      },
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form className={cn("mt-3", className)} onSubmit={handleSubmit}>
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor={`${idPrefix}-name`} className="font-bold">
              Name
            </FieldLabel>
            <Input
              id={`${idPrefix}-name`}
              placeholder="Your full name"
              className="rounded-sm px-3"
              aria-invalid={!!errors.name}
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor={`${idPrefix}-email`} className="font-bold">
              Email
            </FieldLabel>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              placeholder="Email address"
              className="rounded-sm px-3"
              aria-invalid={!!errors.email}
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.businessName}>
            <FieldLabel htmlFor={`${idPrefix}-business`} className="font-bold">
              Business Name
            </FieldLabel>
            <Input
              id={`${idPrefix}-business`}
              placeholder="Your company"
              className="rounded-sm px-3"
              aria-invalid={!!errors.businessName}
              value={formData.businessName}
              onChange={(e) => handleInputChange("businessName", e.target.value)}
            />
            {errors.businessName && <FieldError>{errors.businessName}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor={`${idPrefix}-phone`} className="font-bold">
              Phone
            </FieldLabel>
            <PhoneInput
              id={`${idPrefix}-phone`}
              defaultCountry="IN"
              international
              countryCallingCodeEditable={false}
              placeholder="Enter phone number"
              aria-invalid={!!errors.phone}
              value={formData.phone}
              onChange={(value) => handleInputChange("phone", value ?? "")}
            />
            {errors.phone && <FieldError>{errors.phone}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.preferredDate}>
            <FieldLabel htmlFor={`${idPrefix}-preferred-date`} className="font-bold">
              Preferred Date
              <span className="ml-1 text-xs font-medium text-muted-foreground">(Optional)</span>
            </FieldLabel>
            <DatePicker
              id={`${idPrefix}-preferred-date`}
              className="h-9 w-full rounded-sm px-3"
              placeholder="Pick a date"
              invalid={!!errors.preferredDate}
              value={formData.preferredDate ? fromDateKey(formData.preferredDate) : undefined}
              onChange={(date) => handleInputChange("preferredDate", date ? toDateKey(date) : "")}
              disabled={(date) => date < firstBookableDay || date > lastBookableDay}
              startMonth={firstBookableDay}
              endMonth={lastBookableDay}
            />
            {errors.preferredDate && <FieldError>{errors.preferredDate}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor={`${idPrefix}-preferred-time`} className="font-bold">
              Preferred Time
              <span className="ml-1 text-xs font-medium text-muted-foreground">(Optional)</span>
            </FieldLabel>
            <Select
              items={TIME_ITEMS}
              value={formData.preferredTime || ANY_TIME}
              onValueChange={(value) =>
                handleInputChange("preferredTime", !value || value === ANY_TIME ? "" : value)
              }
            >
              <SelectTrigger id={`${idPrefix}-preferred-time`} className="w-full rounded-sm px-3">
                <SelectValue placeholder="No preference" />
              </SelectTrigger>
              <SelectContent>
                {TIME_ITEMS.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-message`} className="font-bold">
            Message
            <span className="ml-1 text-xs font-medium text-muted-foreground">(Optional)</span>
          </FieldLabel>
          <Textarea
            id={`${idPrefix}-message`}
            rows={2}
            placeholder="Tell us a bit about what you're looking for..."
            className="rounded-sm px-3"
            value={formData.message}
            onChange={(e) => handleInputChange("message", e.target.value)}
          />
        </Field>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Booking..." : "Book My Demo"}
        </Button>

        <p className="-mt-1 text-center text-[11px] text-slate-400">
          No credit card required · We'll only use your details to schedule the demo.
        </p>
      </FieldGroup>
    </form>
  );
}
