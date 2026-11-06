import { zodResolver } from "@hookform/resolvers/zod";
import { IconRestore } from "@tabler/icons-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { BusinessInfo } from "@/backend/metaAgent/metaAgent.api";
import {
  useBusinessInfo,
  useDeleteBusinessInfo,
  useSyncBusinessInfo,
  useUpdateBusinessInfo,
} from "@/backend/metaAgent/metaAgent.query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { businessInfoFormSchema, type BusinessInfoFormValues } from "../../metaAgent.schemas";
import { FormField } from "../shared/FormField";
import { PanelCard } from "../shared/PanelCard";

const EMPTY: BusinessInfoFormValues = {
  business_description: "",
  payment_method: "",
  return_policy: "",
  purchase_info: "",
  delivery_and_shipping: "",
  email: "",
  address: "",
  hours_of_operation: "",
};

const toForm = (data?: BusinessInfo): BusinessInfoFormValues => ({
  business_description: data?.business_description ?? "",
  payment_method: data?.payment_method ?? "",
  return_policy: data?.return_policy ?? "",
  purchase_info: data?.purchase_info ?? "",
  delivery_and_shipping: data?.delivery_and_shipping ?? "",
  email: data?.contact_info?.email ?? "",
  address: data?.contact_info?.address ?? "",
  hours_of_operation: data?.contact_info?.hours_of_operation ?? "",
});

export function BusinessInfoPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data, isLoading } = useBusinessInfo(waSettingsId);
  const update = useUpdateBusinessInfo(waSettingsId);
  const reset = useDeleteBusinessInfo(waSettingsId);
  const sync = useSyncBusinessInfo(waSettingsId);

  const form = useForm<BusinessInfoFormValues>({
    resolver: zodResolver(businessInfoFormSchema),
    defaultValues: EMPTY,
  });

  // A sync replaces what Meta holds, so the form follows the server rather than
  // keeping a stale draft on screen.
  useEffect(() => {
    if (data) form.reset(toForm(data));
  }, [data, form]);

  const onSubmit = (values: BusinessInfoFormValues) =>
    update.mutate({
      business_description: values.business_description,
      payment_method: values.payment_method,
      return_policy: values.return_policy,
      purchase_info: values.purchase_info,
      delivery_and_shipping: values.delivery_and_shipping,
      contact_info: {
        email: values.email,
        address: values.address,
        hours_of_operation: values.hours_of_operation,
      },
    });

  return (
    <PanelCard
      title="Business info"
      description="Every field is optional — the agent uses whichever ones you fill in."
      syncedAt={data?.businessInfoSyncedAt}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
      actions={
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="ghost" size="sm" loading={reset.isPending}>
                <IconRestore data-icon="inline-start" />
                Reset
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset business info at Meta?</AlertDialogTitle>
              <AlertDialogDescription>
                Clears every business info field Meta holds for this number. Your other knowledge —
                FAQs, files and websites — is untouched.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => reset.mutate(undefined, { onSuccess: () => form.reset(EMPTY) })}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <FormField
              control={form.control}
              name="business_description"
              label="Business description"
              description="What you sell and who you sell it to. The agent leans on this most."
            >
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={3}
                  placeholder="We roast and ship single-origin coffee across India."
                />
              )}
            </FormField>

            <FormField control={form.control} name="payment_method" label="Payment methods">
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={2}
                  placeholder="Cards, UPI, net banking, cash on delivery."
                />
              )}
            </FormField>

            <FormField control={form.control} name="return_policy" label="Return policy">
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={2}
                  placeholder="Unopened items can be returned within 14 days."
                />
              )}
            </FormField>

            <FormField control={form.control} name="purchase_info" label="Purchase info">
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={2}
                  placeholder="How customers order, minimums, bulk pricing."
                />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="delivery_and_shipping"
              label="Delivery and shipping"
            >
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={2}
                  placeholder="Dispatch times, courier partners, shipping charges."
                />
              )}
            </FormField>

            <FieldSeparator />

            <FieldSet>
              <FieldLegend variant="label">Contact info</FieldLegend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField control={form.control} name="email" label="Contact email">
                  {(field, controlProps) => (
                    <Input
                      {...field}
                      {...controlProps}
                      type="email"
                      placeholder="support@example.com"
                    />
                  )}
                </FormField>
                <FormField control={form.control} name="address" label="Address">
                  {(field, controlProps) => (
                    <Input {...field} {...controlProps} placeholder="221B Baker Street, London" />
                  )}
                </FormField>
                <FormField
                  control={form.control}
                  name="hours_of_operation"
                  label="Hours of operation"
                >
                  {(field, controlProps) => (
                    <Input {...field} {...controlProps} placeholder="Mon–Fri 9am–6pm IST" />
                  )}
                </FormField>
              </div>
            </FieldSet>

            <div className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                {update.isPending && <Spinner data-icon="inline-start" />}
                Save &amp; push to Meta
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
    </PanelCard>
  );
}
