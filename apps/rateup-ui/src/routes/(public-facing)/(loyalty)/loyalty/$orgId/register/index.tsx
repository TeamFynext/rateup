import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, notFound, useParams, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
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
  const referCodeParam = searchParams.refer_code || searchParams.ref;

  const { mutate, isPending } = useCreateLoyaltyCustomerMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      dob: undefined,
      referCode: referCodeParam || "",
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <PhoneInput
                      placeholder="Enter phone number"
                      defaultCountry="IN"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your.email@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Referral Code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <input type="hidden" {...form.register("source")} /> */}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Registering..." : "Register"}
            </Button>
          </form>
        </Form>
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
