import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconCheck,
  IconGift,
  IconLoader2,
  IconUserCheck,
} from "@tabler/icons-react";
import { notFound, useParams, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import * as z from "zod";

import { useContactLookupByPhone } from "@/backend/loyalty/customer/customer.query";
import { useCreateLoyaltyCustomerMutation } from "@/backend/loyalty/customer/customer.query";
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

const formSchema = z.object({
  phone: z
    .string()
    .min(1, { message: "Phone number is required" })
    .refine((val) => !val || isValidPhoneNumber(val), {
      message: "Please enter a valid phone number",
    }),
  name: z.string().min(1, { message: "Name is required" }),
  email: z.email("Invalid email address").optional().or(z.literal("")),
  // Optional: plenty of people would rather not give a birthday, and the API has always
  // accepted the field as absent.
  dob: z.date().optional(),
  referCode: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function RegisterForm() {
  const searchParams = useSearch({ strict: false });
  const params = useParams({ strict: false });
  const referCodeRaw = searchParams.refer_code ?? searchParams.ref;
  const referCodeParam = typeof referCodeRaw === "string" ? referCodeRaw : "";

  const session = useSessionContext();
  // The contact lookup is staff-only. This page doubles as the public self-registration
  // link, and an unauthenticated lookup would let anyone probe phone numbers and read
  // back a customer's name — so an anonymous visitor simply never calls it.
  const isStaff = !session.loading && session.doesSessionExist;

  const { mutate, isPending } = useCreateLoyaltyCustomerMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      name: "",
      email: "",
      dob: undefined,
      referCode: referCodeParam,
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
    if (lookup.contact.email) form.setValue("email", lookup.contact.email);
    if (lookup.contact.dob) form.setValue("dob", new Date(lookup.contact.dob));
    setAutofilledFor(phone);
  }, [lookup, phone, phoneIsComplete, autofilledFor, form]);

  useEffect(() => {
    if (referCodeParam) form.setValue("referCode", referCodeParam);
  }, [referCodeParam, form]);

  const onSubmit = (data: FormValues) => {
    mutate(
      {
        ...data,
        // `dob` stays a Date here: axios serialises it to the ISO string the API's
        // `z.iso.datetime().optional()` expects, and an absent one drops out of the JSON
        // body entirely rather than being sent as an empty value.
        orgId: params.orgId as string,
        isPublic: !isStaff,
      },
      {
        onSuccess: () => {
          toast.success("Registration successful! Welcome to our loyalty program.");
          form.reset();
          setAutofilledFor(null);
        },
      },
    );
  };

  if (!params.orgId) throw notFound();

  const knownContact = isStaff && phoneIsComplete && lookup?.contact;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10">
          <IconGift className="size-5 text-primary" />
        </div>
        <CardTitle className="text-xl">Join our loyalty program</CardTitle>
        <CardDescription>Earn points on every visit and unlock rewards.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Phone first: it is the identity the whole program is keyed on, and for staff
              it is what tells us whether we already know this person. */}
          <Controller
            name="phone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Phone number</FieldLabel>
                <PhoneInput
                  id={field.name}
                  placeholder="Enter phone number"
                  defaultCountry="IN"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
                {isStaff && phoneIsComplete && isLookingUp && (
                  <FieldDescription className="flex items-center gap-1.5 text-xs">
                    <IconLoader2 className="size-3 animate-spin" />
                    Checking your contacts…
                  </FieldDescription>
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {lookup?.alreadyMember && phoneIsComplete && (
            <Alert>
              <IconAlertTriangle />
              <AlertTitle>Already a member</AlertTitle>
              <AlertDescription>
                This number is already in the loyalty program. Look them up in the Cashier Portal
                instead of adding them again.
              </AlertDescription>
            </Alert>
          )}

          {knownContact && !lookup?.alreadyMember && (
            <Alert>
              <IconUserCheck />
              <AlertTitle>We already have this contact</AlertTitle>
              <AlertDescription>
                Details below were filled in from your contacts. Edit anything that looks out of
                date.
              </AlertDescription>
            </Alert>
          )}

          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Full name"
                />
                {autofilledFor === phone && field.value && (
                  <FieldDescription className="flex items-center gap-1.5 text-xs text-green-600">
                    <IconCheck className="size-3" />
                    Filled in from your contacts
                  </FieldDescription>
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email (optional)</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="name@example.com"
                  type="email"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="dob"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Date of birth (optional)</FieldLabel>
                <DatePicker value={field.value} onChange={field.onChange} />
                <FieldDescription className="text-xs">
                  Add it to receive a birthday reward.
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="referCode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Referral code (optional)</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter a code if you have one"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" className="mt-2 w-full" disabled={isPending}>
            {isPending ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                Adding…
              </>
            ) : (
              "Join the program"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function RegisterPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconLoader2 className="size-4 animate-spin" />
            Loading…
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
