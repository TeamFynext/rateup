import { zodResolver } from "@hookform/resolvers/zod";
import { IconCamera } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { BUSINESS_VERTICALS } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useBusinessProfile,
  useUpdateBusinessProfileMutation,
  useUpdateProfilePictureMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { getApiErrorMessage } from "@/utils/apiError";

/** What WhatsApp accepts for a profile photo, and the ceiling the API enforces anyway. */
const PHOTO_MIME_TYPES = ["image/jpeg", "image/png"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

interface BusinessProfileFormValues {
  about: string;
  description: string;
  address: string;
  email: string;
  website: string;
  secondWebsite: string;
  vertical: string;
}

const VERTICAL_LABELS: Record<string, string> = {
  OTHER: "Other",
  AUTO: "Automotive",
  BEAUTY: "Beauty, spa and salon",
  APPAREL: "Clothing and apparel",
  EDU: "Education",
  ENTERTAIN: "Entertainment",
  EVENT_PLAN: "Event planning and service",
  FINANCE: "Finance and banking",
  GROCERY: "Food and grocery",
  GOVT: "Public service",
  HOTEL: "Hotel and lodging",
  HEALTH: "Medical and health",
  NONPROFIT: "Non-profit",
  PROF_SERVICES: "Professional services",
  RETAIL: "Shopping and retail",
  TRAVEL: "Travel and transportation",
  RESTAURANT: "Restaurant",
};

/**
 * The business profile customers see when they open the number in WhatsApp — photo, about
 * line, description and contact details. Everything here lives at Meta and is read live.
 */
export function WaBusinessProfileForm({
  phoneId,
  enabled = true,
}: Readonly<{
  phoneId: string;
  /** Skips the Meta lookup while false (e.g. a dialog that isn't open). */
  enabled?: boolean;
}>) {
  const { t: translations } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isPending, error } = useBusinessProfile(phoneId, enabled);
  const updateMutation = useUpdateBusinessProfileMutation();
  const photoMutation = useUpdateProfilePictureMutation();

  const schema = z.object({
    about: z.string().trim().max(139, translations("About is too long")),
    description: z.string().trim().max(512, translations("Description is too long")),
    address: z.string().trim().max(256, translations("Address is too long")),
    email: z.string().trim().max(128, translations("Email is too long")),
    website: z.string().trim().max(256, translations("Website is too long")),
    secondWebsite: z.string().trim().max(256, translations("Website is too long")),
    vertical: z.string(),
  });

  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      about: "",
      description: "",
      address: "",
      email: "",
      website: "",
      secondWebsite: "",
      vertical: "",
    },
  });

  const { reset } = form;
  useEffect(() => {
    if (!profile) return;
    reset({
      about: profile.about ?? "",
      description: profile.description ?? "",
      address: profile.address ?? "",
      email: profile.email ?? "",
      website: profile.websites[0] ?? "",
      secondWebsite: profile.websites[1] ?? "",
      vertical: profile.vertical ?? "",
    });
  }, [profile, reset]);

  function handleSubmit(values: BusinessProfileFormValues) {
    const websites = [values.website, values.secondWebsite].map((site) => site.trim());
    // Blank fields are left out rather than sent as "": Meta answers an empty value with a
    // bare "Something went wrong" instead of clearing the field. The API drops them too.
    updateMutation.mutate({
      phoneId,
      data: {
        ...(values.about ? { about: values.about } : {}),
        ...(values.description ? { description: values.description } : {}),
        ...(values.address ? { address: values.address } : {}),
        ...(values.email ? { email: values.email } : {}),
        ...(websites.some(Boolean) ? { websites: websites.filter(Boolean) } : {}),
        ...(values.vertical
          ? { vertical: values.vertical as (typeof BUSINESS_VERTICALS)[number] }
          : {}),
      },
    });
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Lets the same file be picked again after a failed attempt.
    event.target.value = "";
    if (!file) return;

    if (!PHOTO_MIME_TYPES.includes(file.type)) {
      toast.error(translations("Profile photo must be a JPEG or PNG image"));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error(translations("Profile photo must be 5 MB or smaller"));
      return;
    }
    photoMutation.mutate({ phoneId, file });
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{translations("Couldn't read the profile from Meta")}</AlertTitle>
        <AlertDescription>
          {getApiErrorMessage(error, translations("Please try again."))}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {isPending ? (
          <Skeleton className="size-16 rounded-full" />
        ) : (
          <Avatar className="size-16">
            {profile?.profilePictureUrl && (
              <AvatarImage src={profile.profilePictureUrl} alt={translations("Profile photo")} />
            )}
            <AvatarFallback>
              <IconCamera size={20} className="text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoMutation.isPending}
          >
            {photoMutation.isPending && <Spinner />}
            {profile?.profilePictureUrl
              ? translations("Change photo")
              : translations("Upload photo")}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            {translations("JPEG or PNG, up to 5 MB. Square images work best.")}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={PHOTO_MIME_TYPES.join(",")}
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <Controller
          name="about"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${phoneId}-about`}>{translations("About")}</FieldLabel>
              <Input {...field} id={`${phoneId}-about`} aria-invalid={fieldState.invalid} />
              <FieldDescription>
                {translations("The one-line status under the business name. Up to 139 characters.")}
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${phoneId}-description`}>
                {translations("Description")}
              </FieldLabel>
              <Textarea
                {...field}
                id={`${phoneId}-description`}
                rows={3}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${phoneId}-email`}>{translations("Email")}</FieldLabel>
                <Input {...field} id={`${phoneId}-email`} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="vertical"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={`${phoneId}-vertical`}>{translations("Category")}</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value ?? "")}
                  items={BUSINESS_VERTICALS.map((vertical) => ({
                    value: vertical,
                    label: translations(VERTICAL_LABELS[vertical]),
                  }))}
                >
                  <SelectTrigger id={`${phoneId}-vertical`} className="w-full">
                    <SelectValue placeholder={translations("Select a category")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_VERTICALS.map((vertical) => (
                      <SelectItem key={vertical} value={vertical}>
                        {translations(VERTICAL_LABELS[vertical])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </div>

        <Controller
          name="address"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${phoneId}-address`}>{translations("Address")}</FieldLabel>
              <Input {...field} id={`${phoneId}-address`} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            name="website"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${phoneId}-website`}>{translations("Website")}</FieldLabel>
                <Input
                  {...field}
                  id={`${phoneId}-website`}
                  aria-invalid={fieldState.invalid}
                  placeholder="https://example.com"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="secondWebsite"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${phoneId}-secondWebsite`}>
                  {translations("Second website")}
                </FieldLabel>
                <Input
                  {...field}
                  id={`${phoneId}-secondWebsite`}
                  aria-invalid={fieldState.invalid}
                  placeholder="https://example.com"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="mr-auto text-xs text-muted-foreground">
            {translations(
              "WhatsApp has no way to clear a field, so anything left blank stays as it is.",
            )}
          </p>
          <Button type="submit" disabled={updateMutation.isPending || isPending}>
            {updateMutation.isPending && <Spinner />}
            {translations("Save profile")}
          </Button>
        </div>
      </form>
    </div>
  );
}
