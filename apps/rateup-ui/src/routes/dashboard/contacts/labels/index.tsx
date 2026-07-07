import { createFileRoute } from "@tanstack/react-router";
import { Plus, Tag } from "lucide-react";
import { useMemo, useState } from "react";

import {
  useContactLabels,
  useCreateContactLabelMutation,
  useDeleteContactLabelMutation,
  useUpdateContactLabelMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

import { DataTableToolbar } from "../../../../components/dashboard/contacts/labels/data-table-toolbar.tsx";
import type { ContactLabel } from "../../../../components/dashboard/contacts/labels/utils.tsx";
import { createColumns } from "../../../../components/dashboard/contacts/labels/utils.tsx";

export const Route = createFileRoute("/dashboard/contacts/labels/")({
  component: LabelsPage,
});

function LabelsPage() {
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    createLabelMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        setFormData({ name: "", color: "#3b82f6", description: "" });
      },
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
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
        label._count.contactLabels > 0
          ? `Are you sure you want to delete "${label.name}"? This label is currently assigned to ${label._count.contactLabels} contact${label._count.contactLabels === 1 ? "" : "s"}. Deleting this label will remove it from all contacts.`
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
      color: label.color,
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
            <Tag className="w-12 h-12 mx-auto text-gray-400 mb-4" />
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
              <Plus className="w-4 h-4 mr-2" />
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
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter label name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded border"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </div>
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
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter label name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    id="edit-color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded border"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </div>
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
