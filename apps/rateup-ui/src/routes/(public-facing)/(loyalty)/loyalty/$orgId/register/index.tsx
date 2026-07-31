import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, notFound, useParams, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import * as z from "zod";

import { useCreateLoyaltyCustomerMutation } from "@/backend/loyalty/customer/customer.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";

export const Route = createFileRoute("/(public-facing)/(loyalty)/loyalty/$orgId/register/")({
  component: RegisterPage,
});

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Name is required",
  }),
  phone: z
    .string()
    .min(1, {
      message: "Phone number is required",
    })
    .refine((val) => !val || isValidPhoneNumber(val), {
      message: "Please enter a valid phone number",
    }),
  email: z.email("Invalid email address").optional().or(z.literal("")),
  dob: z.date(),
  referCode: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function RegisterForm() {
  const searchParams = useSearch({ strict: false });
  const params = useParams({
    strict: false,
  });
  const referCodeRaw = searchParams.refer_code ?? searchParams.ref;
  const referCodeParam = typeof referCodeRaw === "string" ? referCodeRaw : "";

  const { mutate, isPending } = useCreateLoyaltyCustomerMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      dob: undefined,
      referCode: referCodeParam,
    },
  });

  // Update referCode if param changes
  useEffect(() => {
    if (referCodeParam) {
      form.setValue("referCode", referCodeParam);
    }
  }, [referCodeParam, form]);

  const onSubmit = (data: FormValues) => {
    mutate(
      { ...data, orgId: params.orgId as string, isPublic: true },
      {
        onSuccess: () => {
          toast.success("Registration successful! Welcome to our loyalty program.");
          form.reset();
        },
      },
    );
  };
  if (!params.orgId) throw notFound();

  return (
    <Card className="w-full max-w-md mx-auto mt-10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Loyalty Registration</CardTitle>
        <CardDescription className="text-center">
          Sign up to earn points and rewards!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  placeholder="Your Name"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="phone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Phone Number</FieldLabel>
                <PhoneInput
                  id={field.name}
                  placeholder="Enter phone number"
                  defaultCountry="IN"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="your.email@example.com"
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
                <FieldLabel htmlFor={field.name}>Date of Birth</FieldLabel>
                <DatePicker value={field.value} onChange={field.onChange} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="referCode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Referral Code (Optional)</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Referral Code"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* <input type="hidden" {...form.register("source")} /> */}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Registering..." : "Register"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RegisterPage() {
  return (
    <div className="container mx-auto p-4 flex items-center justify-center min-h-[calc(100vh-100px)]">
      <Suspense fallback={<div>Loading form...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
