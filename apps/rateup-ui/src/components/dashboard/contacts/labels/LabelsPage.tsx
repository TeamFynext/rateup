// Extracted verbatim from the `/dashboard/contacts/labels/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconPlus, IconTag } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import {
  useContactLabels,
  useCreateContactLabelMutation,
  useDeleteContactLabelMutation,
  useUpdateContactLabelMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { DataTableToolbar } from "@/components/dashboard/contacts/labels/data-table-toolbar.tsx";
import type { ContactLabel } from "@/components/dashboard/contacts/labels/utils.tsx";
import { createColumns } from "@/components/dashboard/contacts/labels/utils.tsx";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

export function LabelsPage() {
  const { data: labels = [], isPending } = useContactLabels();
  const createLabelMutation = useCreateContactLabelMutation();
  const updateLabelMutation = useUpdateContactLabelMutation();
  const deleteLabelMutation = useDeleteContactLabelMutation();
  const confirm = useConfirm();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<ContactLabel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
    description: "",
  });

  const columns = useMemo(
    () =>
      createColumns({
        onEdit: openEditModal,
        onDelete: handleDelete,
      }),
    [],
  );

  const handleCreate = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    createLabelMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        setFormData({ name: "", color: "#3b82f6", description: "" });
      },
    });
  };

  const handleEdit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLabel) return;

    updateLabelMutation.mutate(
      { labelId: selectedLabel.id, data: formData },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
          setSelectedLabel(null);
        },
      },
    );
  };

  async function handleDelete(label: ContactLabel) {
    const shouldDelete = await confirm({
      title: "Delete Label",
      description:
        (label._count?.contactLabels ?? 0) > 0
          ? `Are you sure you want to delete "${label.name}"? This label is currently assigned to ${label._count?.contactLabels ?? 0} contact${(label._count?.contactLabels ?? 0) === 1 ? "" : "s"}. Deleting this label will remove it from all contacts.`
          : `Are you sure you want to delete "${label.name}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!shouldDelete) return;

    deleteLabelMutation.mutate(label.id, {
      onSuccess: () => {
        setSelectedLabel(null);
      },
    });
  }

  function openEditModal(label: ContactLabel) {
    setSelectedLabel(label);
    setFormData({
      name: label.name,
      color: label.color ?? "",
      description: label.description || "",
    });
    setIsEditModalOpen(true);
  }

  const resetForm = () => {
    setFormData({ name: "", color: "#3b82f6", description: "" });
  };

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  const submitting =
    createLabelMutation.isPending || updateLabelMutation.isPending || deleteLabelMutation.isPending;

  return (
    <div className="h-full">
      {labels.length === 0 ? (
        <div className="grid place-content-center py-12 h-full">
          <div className="text-center">
            <IconTag className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No labels yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first label to start organizing contacts.
            </p>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
            >
              <IconPlus data-icon="inline-start" />
              Create Label
            </Button>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={labels}
          DataTableToolbar={(props) => (
            <DataTableToolbar
              {...props}
              onCreateClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
            />
          )}
        />
      )}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Label</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <FieldGroup className="gap-4 py-4">
              <Field>
                <FieldLabel htmlFor="name">Name *</FieldLabel>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter label name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="color">Color</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-12 rounded border"
                  />
                  <Input
                    aria-label="Label color hex value"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Label"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <FieldGroup className="gap-4 py-4">
              <Field>
                <FieldLabel htmlFor="edit-name">Name *</FieldLabel>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter label name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-color">Color</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="edit-color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-12 rounded border"
                  />
                  <Input
                    aria-label="Label color hex value"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-description">Description</FieldLabel>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Label"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
