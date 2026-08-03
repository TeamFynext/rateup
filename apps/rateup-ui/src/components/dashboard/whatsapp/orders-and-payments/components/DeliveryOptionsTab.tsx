import {
  IconCheck,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
  IconTruck,
  IconX,
} from "@tabler/icons-react";
import React, { useState } from "react";
import { useId } from "react";

import type { DeliveryOption } from "@/backend/whatsapp/catalog/catalog.api";
import {
  useCatalogSettings,
  useUpdateCatalogSettings,
} from "@/backend/whatsapp/catalog/catalog.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const emptyOption = (): DeliveryOption => ({
  id: crypto.randomUUID(),
  name: "",
  charge: 0,
  days: "",
  enabled: true,
});

export default function DeliveryOptionsTab({ catalogId }: { catalogId: string }) {
  const uid = useId();
  const { data: settings, isLoading } = useCatalogSettings(catalogId);
  const { mutateAsync: save, isPending: isSaving } = useUpdateCatalogSettings(catalogId);

  const [options, setOptions] = useState<DeliveryOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<DeliveryOption>>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newDraft, setNewDraft] = useState<DeliveryOption>(emptyOption());

  React.useEffect(() => {
    if (settings?.deliveryOptions) {
      setOptions(settings.deliveryOptions as DeliveryOption[]);
    }
  }, [settings]);

  const persist = async (updated: DeliveryOption[]) => {
    setOptions(updated);
    await save({ deliveryOptions: updated });
  };

  const toggleEnabled = async (id: string) => {
    const updated = options.map((o) => (o.id === id ? { ...o, enabled: !o.enabled } : o));
    await persist(updated);
  };

  const startEdit = (opt: DeliveryOption) => {
    setEditingId(opt.id);
    setEditDraft({ ...opt });
  };

  const saveEdit = async () => {
    const updated = options.map((o) =>
      o.id === editingId ? ({ ...o, ...editDraft } as DeliveryOption) : o,
    );
    await persist(updated);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const deleteOption = async (id: string) => {
    const updated = options.filter((o) => o.id !== id);
    await persist(updated);
  };

  const saveNew = async () => {
    if (!newDraft.name.trim()) return;
    const updated = [...options, { ...newDraft, charge: Number(newDraft.charge) }];
    await persist(updated);
    setAddingNew(false);
    setNewDraft(emptyOption());
  };

  if (isLoading || !catalogId) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Delivery Partners</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enabled options appear as choices in the WhatsApp List Message sent after address
            collection.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAddingNew(true)}
          disabled={addingNew}
          className="gap-1.5"
        >
          <IconPlus className="h-3.5 w-3.5" data-icon="inline-start" /> Add Option
        </Button>
      </div>

      {/* Empty state */}
      {options.length === 0 && !addingNew && (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <IconTruck className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">No delivery options yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first delivery partner to enable delivery selection in WhatsApp.
              </p>
            </div>
            <Button size="sm" onClick={() => setAddingNew(true)} className="gap-1.5 mt-1">
              <IconPlus className="h-3.5 w-3.5" /> Add First Option
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Option list */}
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <Card key={opt.id} className={`transition-all ${!opt.enabled ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              {editingId === opt.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field className="col-span-2 sm:col-span-1">
                      <FieldLabel htmlFor={`${uid}-partner-name-${idx}`} className="text-xs">
                        Partner Name
                      </FieldLabel>
                      <Input
                        id={`${uid}-partner-name-${idx}`}
                        value={editDraft.name ?? ""}
                        onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="e.g. Delhivery"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${uid}-charge-${idx}`} className="text-xs">
                        Charge (₹)
                      </FieldLabel>
                      <Input
                        id={`${uid}-charge-${idx}`}
                        type="number"
                        value={editDraft.charge ?? 0}
                        onChange={(e) =>
                          setEditDraft((p) => ({
                            ...p,
                            charge: Number(e.target.value),
                          }))
                        }
                        className="h-8 text-sm"
                        placeholder="60"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${uid}-est-days-${idx}`} className="text-xs">
                        Est. Days
                      </FieldLabel>
                      <Input
                        id={`${uid}-est-days-${idx}`}
                        value={editDraft.days ?? ""}
                        onChange={(e) => setEditDraft((p) => ({ ...p, days: e.target.value }))}
                        className="h-8 text-sm"
                        placeholder="3-5"
                      />
                    </Field>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={saveEdit}
                      disabled={isSaving}
                      className="gap-1.5 h-7 px-3 text-xs"
                    >
                      {isSaving ? (
                        <IconLoader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <IconCheck className="h-3 w-3" />
                      )}{" "}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="gap-1.5 h-7 px-3 text-xs"
                    >
                      <IconX className="h-3 w-3" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <IconTruck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{opt.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        ₹{opt.charge}
                      </Badge>
                      {opt.days && (
                        <span className="text-xs text-muted-foreground">{opt.days} days</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={opt.enabled}
                      onCheckedChange={() => toggleEnabled(opt.id)}
                      disabled={isSaving}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => startEdit(opt)}
                    >
                      <IconPencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteOption(opt.id)}
                      disabled={isSaving}
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add new form */}
      {addingNew && (
        <Card className="border-primary/30 border-dashed">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">New Delivery Option</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor={`${uid}-partner-name-2`} className="text-xs">
                  Partner Name
                </FieldLabel>
                <Input
                  id={`${uid}-partner-name-2`}
                  value={newDraft.name}
                  onChange={(e) => setNewDraft((p) => ({ ...p, name: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder="e.g. Delhivery"
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${uid}-charge-2`} className="text-xs">
                  Charge (₹)
                </FieldLabel>
                <Input
                  id={`${uid}-charge-2`}
                  type="number"
                  value={newDraft.charge}
                  onChange={(e) =>
                    setNewDraft((p) => ({
                      ...p,
                      charge: Number(e.target.value),
                    }))
                  }
                  className="h-8 text-sm"
                  placeholder="60"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${uid}-est-days-2`} className="text-xs">
                  Est. Days
                </FieldLabel>
                <Input
                  id={`${uid}-est-days-2`}
                  value={newDraft.days ?? ""}
                  onChange={(e) => setNewDraft((p) => ({ ...p, days: e.target.value }))}
                  className="h-8 text-sm"
                  placeholder="3-5"
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={saveNew}
                disabled={isSaving || !newDraft.name.trim()}
                className="gap-1.5 h-7 px-3 text-xs"
              >
                {isSaving ? (
                  <IconLoader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <IconCheck className="h-3 w-3" />
                )}{" "}
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAddingNew(false);
                  setNewDraft(emptyOption());
                }}
                className="h-7 px-3 text-xs"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {options.length > 0 && (
        <p className="text-xs text-muted-foreground">
          💡 Only <strong>enabled</strong> options appear in the WhatsApp delivery selection
          message. Toggle off to temporarily hide a partner without deleting it.
        </p>
      )}
    </div>
  );
}
