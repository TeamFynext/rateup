import { IconClock, IconEdit } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateBusinessHour,
  useDeleteBusinessHour,
  useGetAllBusinessHours,
  useUpdateBusinessHour,
} from "@/backend/org/business-hours/business-hours.query";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { BusinessHoursEditorDialog } from "./BusinessHoursEditorDialog.tsx";
import { BusinessHoursListDialog } from "./BusinessHoursListDialog.tsx";
import type { BusinessHoursFormValues } from "./schema.ts";
import { buildDefaultSchedule, formatDaySchedule } from "./schema.ts";

interface Props {
  canManage: boolean;
}

export function BusinessHoursSection({ canManage }: Readonly<Props>) {
  const { t } = useTranslation();

  const { data: businessHours, isLoading } = useGetAllBusinessHours();
  const createMutation = useCreateBusinessHour();
  const updateMutation = useUpdateBusinessHour();
  const deleteMutation = useDeleteBusinessHour();

  const [listOpen, setListOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const list = businessHours || [];

  const editingItem = useMemo(
    () => (editingId ? list.find((x) => x.id === editingId) : undefined),
    [editingId, list],
  );

  const initialValues: BusinessHoursFormValues = useMemo(
    () =>
      editingItem
        ? {
            name: editingItem.name,
            timezone: editingItem.timezone,
            channels: editingItem.channels,
            description: editingItem.description,
            schedule: editingItem.schedule as BusinessHoursFormValues["schedule"],
          }
        : {
            name: "",
            timezone: "Asia/Kolkata",
            channels: [],
            description: "",
            schedule: buildDefaultSchedule(),
          },
    [editingItem],
  );

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

  const openAdd = () => {
    setEditingId(null);
    setListOpen(false);
    setEditorOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setListOpen(false);
    setEditorOpen(true);
  };

  const onSave = async (values: BusinessHoursFormValues) => {
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setEditorOpen(false);
  };

  const onDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-48 w-full" />
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center">
              <IconClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="">{t("Business Hours")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("Manage multiple business hours for different channels and timezones")}
              </p>
            </div>
          </div>
          {canManage && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setListOpen(true)}>
              <IconEdit className="w-4 h-4" />
              {t("Manage")}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {list.map((bh) => (
            <div key={bh.id} className="border rounded-lg p-4 bg-background">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium">{bh.name}</h4>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>⏰ {bh.timezone}</span>
                    {/* <span>📱 {bh.channels?.join(", ")}</span> */}
                  </div>
                  {bh.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {bh.description}
                    </p>
                  )}
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(bh.id)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <IconEdit className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {Object.entries(bh.schedule).map(([day, schedule]) => (
                  <div key={day} className="flex items-center justify-between py-1">
                    <span className="font-medium text-gray-700 dark:text-gray-400 capitalize min-w-[80px]">
                      {getDayName(day)}
                    </span>
                    <span
                      className={`text-sm ${schedule.isOpen ? "text-green-600" : "text-gray-500"}`}
                    >
                      {formatDaySchedule(schedule)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {list.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <IconClock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t("No business hours set up yet")}</p>
              <p className="text-xs">{t("Click 'Manage' to add your first business hours")}</p>
            </div>
          )}
        </div>
      </Card>
      <BusinessHoursListDialog
        open={listOpen}
        onOpenChange={setListOpen}
        list={list}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={onDelete}
        canDelete={list.length > 1 && canManage}
      />
      <BusinessHoursEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialValues={initialValues}
        onSave={onSave}
        editing={!!editingId}
      />
    </>
  );
}
