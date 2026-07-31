import { IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import type { BusinessInfo } from "@/backend/metaAgent/metaAgent.api";
import {
  useBusinessInfo,
  useSyncBusinessInfo,
  useUpdateBusinessInfo,
} from "@/backend/metaAgent/metaAgent.query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { formatSyncedAt } from "../../utils/formatSyncedAt";

export function BusinessInfoPanel({ waSettingsId }: { waSettingsId: string }) {
  const { data, isLoading } = useBusinessInfo(waSettingsId);
  const update = useUpdateBusinessInfo(waSettingsId);
  const sync = useSyncBusinessInfo(waSettingsId);
  const [form, setForm] = useState<BusinessInfo>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Business info</CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatSyncedAt(data?.businessInfoSyncedAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={sync.isPending} onClick={() => sync.mutate()}>
          <IconRefresh data-icon="inline-start" className={sync.isPending ? "animate-spin" : ""} />
          Sync from Meta
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="business-description">Business description</FieldLabel>
              <Textarea
                id="business-description"
                placeholder="What does your business do?"
                value={form.business_description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, business_description: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-method">Payment methods</FieldLabel>
              <Textarea
                id="payment-method"
                placeholder="Cards, UPI, cash on delivery..."
                value={form.payment_method ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="return-policy">Return policy</FieldLabel>
              <Textarea
                id="return-policy"
                value={form.return_policy ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, return_policy: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="purchase-info">Purchase info</FieldLabel>
              <Textarea
                id="purchase-info"
                value={form.purchase_info ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, purchase_info: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="delivery-shipping">Delivery and shipping</FieldLabel>
              <Textarea
                id="delivery-shipping"
                value={form.delivery_and_shipping ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, delivery_and_shipping: e.target.value }))}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="contact-email">Contact email</FieldLabel>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.contact_info?.email ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      contact_info: { ...f.contact_info, email: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="contact-address">Address</FieldLabel>
                <Input
                  id="contact-address"
                  value={form.contact_info?.address ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      contact_info: { ...f.contact_info, address: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="contact-hours">Hours of operation</FieldLabel>
                <Input
                  id="contact-hours"
                  placeholder="Mon-Fri 9am-6pm"
                  value={form.contact_info?.hours_of_operation ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      contact_info: { ...f.contact_info, hours_of_operation: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button disabled={update.isPending} onClick={() => update.mutate(form)}>
                Save & push to Meta
              </Button>
            </div>
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  );
}
