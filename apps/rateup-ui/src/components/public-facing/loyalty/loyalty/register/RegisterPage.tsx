import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCheck,
  IconCircleCheck,
  IconGift,
  IconLoader2,
  IconUserCheck,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { notFound, useParams, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import * as z from "zod";

import {
  createLoyaltyCustomer,
  LOYALTY_GENDERS,
  type LoyaltyGender,
} from "@/backend/loyalty/customer/customer.api";
import { useContactLookupByPhone } from "@/backend/loyalty/customer/customer.query";
import {
  getPublicLoyaltyProgram,
  type PublicLoyaltyProgram,
} from "@/backend/loyalty/publicProgram.api";
import {
  brandGradient,
  initialsOf,
  readableTextOn,
} from "@/components/dashboard/loyalty/onboarding/brand.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

const formSchema = z.object({
  phone: z
    .string()
    .min(1, { message: "Phone number is required" })
    .refine((val) => !val || isValidPhoneNumber(val), {
      message: "Please enter a valid phone number",
    }),
  name: z.string().min(1, { message: "Name is required" }),
  // Both optional: plenty of people would rather not say, and the API accepts them absent.
  dob: z.date().optional(),
  gender: z.enum(LOYALTY_GENDERS).optional(),
  referCode: z.string().optional(),
  /**
   * Honeypot. Invisible to people, filled in by bots that complete every field. The API
   * answers a filled one with a fake success and creates nothing.
   */
  website: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

/** The brand navy when a programme has not chosen a colour. */
const DEFAULT_COLOUR = "#1c518e";

/** The Select needs a real value for "unset"; this one never reaches the API. */
const GENDER_UNSET = "unset";

function RegisterForm({ program }: Readonly<{ program: PublicLoyaltyProgram | undefined }>) {
  const { t } = useTranslation();
  const searchParams = useSearch({ strict: false });
  const params = useParams({ strict: false });
  const referCodeRaw = searchParams.refer_code ?? searchParams.ref;
  const referCodeParam = typeof referCodeRaw === "string" ? referCodeRaw : "";

  const session = useSessionContext();
  // The contact lookup is staff-only. This page doubles as the public self-registration
  // link, and an unauthenticated lookup would let anyone probe phone numbers and read
  // back a customer's name — so an anonymous visitor simply never calls it.
  const isStaff = !session.loading && session.doesSessionExist;

  // A local mutation rather than the shared hook: that one toasts and sweeps dashboard
  // caches, neither of which belongs on a customer's phone.
  const join = useMutation({ mutationFn: createLoyaltyCustomer });
  const [joined, setJoined] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      name: "",
      dob: undefined,
      gender: undefined,
      referCode: referCodeParam,
      website: "",
    },
  });

  const phone = form.watch("phone");
  const phoneIsComplete = Boolean(phone) && isValidPhoneNumber(phone);

  // Only look up a number that is actually complete — firing per keystroke would be a
  // request for every digit of every number.
  const { data: lookup, isFetching: isLookingUp } = useContactLookupByPhone(
    phoneIsComplete ? phone : "",
    isStaff,
  );

  // Tracks which number the name was filled from, so re-entering a number does not
  // overwrite a name the user has since corrected.
  const [autofilledFor, setAutofilledFor] = useState<string | null>(null);

  useEffect(() => {
    if (!lookup?.contact || !phoneIsComplete || autofilledFor === phone) return;

    if (lookup.contact.name) form.setValue("name", lookup.contact.name);
    if (lookup.contact.dob) form.setValue("dob", new Date(lookup.contact.dob));
    if (lookup.contact.gender) form.setValue("gender", lookup.contact.gender);
    setAutofilledFor(phone);
  }, [lookup, phone, phoneIsComplete, autofilledFor, form]);

  useEffect(() => {
    if (referCodeParam) form.setValue("referCode", referCodeParam);
  }, [referCodeParam, form]);

  if (!params.orgId) throw notFound();
  const orgId = params.orgId;

  const onSubmit = (data: FormValues) => {
    join.mutate(
      {
        ...data,
        // `dob` stays a Date here: axios serialises it to the ISO string the API's
        // `z.iso.datetime().optional()` expects, and an absent one drops out of the JSON
        // body entirely rather than being sent as an empty value.
        orgId,
        isPublic: !isStaff,
      },
      {
        onSuccess: () => {
          setJoined(true);
          form.reset();
          setAutofilledFor(null);
        },
      },
    );
  };

  const knownContact = isStaff && phoneIsComplete && lookup?.contact;
  const colour = program?.brandColor ?? DEFAULT_COLOUR;
  const venue = program?.name ?? t("our loyalty program");
  const pointsName = program?.currencyName ?? t("points");

  return (
    <Card className="mx-auto w-full max-w-md overflow-hidden">
      <div
        className="relative h-24 bg-cover bg-center"
        style={
          program?.heroImageUrl
            ? { backgroundImage: `url(${program.heroImageUrl})`, backgroundColor: colour }
            : { background: brandGradient(colour) }
        }
      >
        <div
          className="absolute -bottom-7 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-card text-base font-bold shadow-sm"
          style={{ color: colour }}
        >
          {program?.logoUrl ? (
            <img src={program.logoUrl} alt="" className="size-full object-cover" />
          ) : program ? (
            initialsOf(program.businessName ?? program.name)
          ) : (
            <IconGift className="size-6" />
          )}
        </div>
      </div>

      <CardHeader className="pt-9 text-center">
        <CardTitle className="font-display text-xl">
          {program ? t("Join {venue}", { venue }) : t("Join our loyalty program")}
        </CardTitle>
        <CardDescription>
          {program && program.signupBonus > 0
            ? t("Join and get {count} {points} to start, then earn on every visit.", {
                count: program.signupBonus,
                points: pointsName,
              })
            : t("Earn {points} on every visit and unlock rewards.", { points: pointsName })}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {joined ? (
          <JoinedState
            program={program}
            colour={colour}
            isStaff={isStaff}
            onAgain={() => setJoined(false)}
          />
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Phone first: it is the identity the whole program is keyed on, and for staff
                it is what tells us whether we already know this person. */}
            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Phone number")}</FieldLabel>
                  <PhoneInput
                    id={field.name}
                    placeholder={t("Enter phone number")}
                    defaultCountry="IN"
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                  />
                  {isStaff && phoneIsComplete && isLookingUp && (
                    <FieldDescription className="flex items-center gap-1.5 text-xs">
                      <IconLoader2 className="size-3 animate-spin" />
                      {t("Checking your contacts…")}
                    </FieldDescription>
                  )}
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {lookup?.alreadyMember && phoneIsComplete && (
              <Alert>
                <IconAlertTriangle />
                <AlertTitle>{t("Already a member")}</AlertTitle>
                <AlertDescription>
                  {t(
                    "This number is already in the loyalty program. Look them up in the Cashier Portal instead of adding them again.",
                  )}
                </AlertDescription>
              </Alert>
            )}

            {knownContact && !lookup?.alreadyMember && (
              <Alert>
                <IconUserCheck />
                <AlertTitle>{t("We already have this contact")}</AlertTitle>
                <AlertDescription>
                  {t(
                    "Details below were filled in from your contacts. Edit anything that looks out of date.",
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Name")}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder={t("Full name")}
                  />
                  {autofilledFor === phone && field.value && (
                    <FieldDescription className="flex items-center gap-1.5 text-xs text-ru-green-600 dark:text-ru-green-300">
                      <IconCheck className="size-3" />
                      {t("Filled in from your contacts")}
                    </FieldDescription>
                  )}
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="dob"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Date of birth (optional)")}</FieldLabel>
                  <DatePicker
                    id={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    startMonth={new Date(1900, 0)}
                  />
                  <FieldDescription className="text-xs">
                    {t("Add it to receive a birthday reward.")}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="gender"
              control={form.control}
              render={({ field, fieldState }) => {
                const labels: Record<LoyaltyGender, string> = {
                  MALE: t("Male"),
                  FEMALE: t("Female"),
                  OTHER: t("Other"),
                };
                const items = [
                  { value: GENDER_UNSET, label: t("Prefer not to say") },
                  ...LOYALTY_GENDERS.map((value) => ({ value, label: labels[value] })),
                ];
                return (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="register-gender">{t("Gender (optional)")}</FieldLabel>
                    <Select
                      value={field.value ?? GENDER_UNSET}
                      onValueChange={(value) =>
                        // `find` narrows to the enum without a cast; the "unset" sentinel misses.
                        field.onChange(LOYALTY_GENDERS.find((gender) => gender === value))
                      }
                      items={items}
                    >
                      <SelectTrigger
                        id="register-gender"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                );
              }}
            />

            <Controller
              name="referCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{t("Referral code (optional)")}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder={t("Enter a code if you have one")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Honeypot: off-screen rather than display:none, which bots skip. People never
                see it, tab past it, or hear it. */}
            <Controller
              name="website"
              control={form.control}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ""}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />
              )}
            />

            {join.isError && (
              <Alert variant="destructive">
                <IconAlertTriangle />
                <AlertTitle>{t("Could not join right now")}</AlertTitle>
                <AlertDescription>
                  {getApiErrorMessage(join.error, t("Please try again in a moment."))}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={join.isPending}
              style={{ backgroundColor: colour, color: readableTextOn(colour) }}
            >
              {join.isPending ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  {t("Joining…")}
                </>
              ) : (
                t("Join the program")
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * After joining. A web signup's bonus is held until the customer's first WhatsApp message
 * or purchase — bots gain nothing, people get a nudge to say hello.
 */
function JoinedState({
  program,
  colour,
  isStaff,
  onAgain,
}: Readonly<{
  program: PublicLoyaltyProgram | undefined;
  colour: string;
  isStaff: boolean;
  onAgain: () => void;
}>) {
  const { t } = useTranslation();
  const pointsName = program?.currencyName ?? t("points");
  const waLink = program?.whatsappNumber
    ? `https://wa.me/${program.whatsappNumber}?text=${encodeURIComponent("JOIN")}`
    : null;

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <IconCircleCheck className="size-12 text-ru-green-600 dark:text-ru-green-300" />
      <div>
        <p className="font-display text-lg font-bold text-foreground">{t("You're in")}</p>
        <p className="mt-1 max-w-[36ch] text-sm text-muted-foreground">
          {isStaff
            ? t("The customer has been added and starts earning on their next purchase.")
            : program && program.signupBonus > 0
              ? t(
                  "Say hi on WhatsApp to unlock your {count} {points} and see your balance any time.",
                  {
                    count: program.signupBonus,
                    points: pointsName,
                  },
                )
              : t("Say hi on WhatsApp and we'll keep your {points} there.", { points: pointsName })}
        </p>
      </div>
      {!isStaff && waLink && (
        <Button
          className="w-full"
          render={<a href={waLink} target="_blank" rel="noreferrer" />}
          style={{ backgroundColor: colour, color: readableTextOn(colour) }}
        >
          <IconBrandWhatsapp size={18} />
          {t("Open WhatsApp")}
        </Button>
      )}
      {isStaff && (
        <Button variant="outline" onClick={onAgain}>
          {t("Add another customer")}
        </Button>
      )}
    </div>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false });
  const orgId = typeof params.orgId === "string" ? params.orgId : "";
  // Public-safe programme details: the name, branding and what joining is worth. The
  // form works without them, so a failure here just means a plainer page.
  const { data: program } = useQuery({
    queryKey: ["publicLoyaltyProgram", orgId],
    queryFn: () => getPublicLoyaltyProgram(orgId),
    enabled: orgId !== "",
    staleTime: 5 * 60_000,
    retry: false,
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconLoader2 className="size-4 animate-spin" />
            {t("Loading…")}
          </div>
        }
      >
        <RegisterForm program={program} />
      </Suspense>
    </div>
  );
}
