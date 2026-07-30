import { IconDeviceFloppy, IconPencil, IconShare, IconTrash } from "@tabler/icons-react";
import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAddMultipleTestimonialsToCollection,
  useDeleteMultipleTestimonialsFromCollection,
  useGetAllTestimonialsByCollection,
  useGetAllTestimonialsByOrg,
} from "@/backend/testimonials/testimonial.query";
import TestimonialEdit from "@/components/testimonial/TestimonialEdit.tsx";
import TestimonialEditModal from "@/components/testimonial/TestimonialEditModal.tsx";
import TestimonialFilter from "@/components/testimonial/TestimonialFilter.tsx";
import TestimonialSelect from "@/components/testimonial/TestimonialSelect.tsx";
import TestimonialShare, {
  TestimonialShareModal,
} from "@/components/testimonial/TestimonialShare.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { getFilteredTestimonials } from "@/utils/testimonial.ts";

export const Route = createFileRoute("/dashboard/testimonial/$collectionId/")({
  component: CollectionById,
});

export enum TestimonialTabs {
  Select = "Select",
  Edit = "Edit",
  Share = "Share",
}
export interface filterType {
  /** `null` means the filter is off. */
  date: "new" | "old" | null;
  rating: number | null;
  length: "longest" | "shortest" | null;
  teams: string[];
  surveys: string[];
}

function CollectionById() {
  const { update } = useRouteParams();

  const searchParams = useSearch({ strict: false });
  const params = useParams({
    strict: false,
  });

  const tab = searchParams.tab;
  const [activeTab, setActiveTab] = useState<TestimonialTabs | null>(TestimonialTabs.Select);
  const [selectedTestimonialIds, setSelectedTestimonialIds] = useState<string[]>([]);
  const [isDelete, setIsDelete] = useState(false);
  const collectionId = params?.collectionId as string;
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);
  const [filters, setFilters] = useState<filterType>({
    date: null,
    rating: null,
    length: null,
    surveys: [],
    teams: [],
  });
  const [type, setType] = useState<string | null>("date");

  const { data: alltestimonials } = useGetAllTestimonialsByOrg();
  const filteredTestimonials = getFilteredTestimonials(alltestimonials ?? [], filters, type);
  const filteredTestimonialIds = filteredTestimonials?.map((t) => t.id);

  const [openedEdit, setOpenedEdit] = useState(false);

  useEffect(() => {
    update({ collectionId: collection?.name });
  }, [collection]);

  useEffect(() => {
    if (tab && Object.values(TestimonialTabs).includes(tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    setFilters({
      date: null,
      rating: null,
      length: null,
      surveys: [],
      teams: [],
    });
    setType(null);
  }, [activeTab]);

  return (
    <div className="flex flex-col flex-1 p-lg">
      <Tabs
        value={activeTab || TestimonialTabs.Select}
        onValueChange={(value) => setActiveTab(value as TestimonialTabs)}
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-lg font-bold">Testimonials</h1>
          <TabsList>
            <TabsTrigger value={TestimonialTabs.Select}>{TestimonialTabs.Select}</TabsTrigger>
            <TabsTrigger value={TestimonialTabs.Edit}>{TestimonialTabs.Edit}</TabsTrigger>
            <TabsTrigger value={TestimonialTabs.Share}>{TestimonialTabs.Share}</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex gap-4 h-[85vh]">
          <div className="w-52 max-w-52 h-full py-2">
            <UtilityComponent
              {...{
                activeTab,
                selectedTestimonialIds,
                setActiveTab,
                setSelectedTestimonialIds,
                filteredTestimonialIds,
                openEdit: () => setOpenedEdit(true),
                toggleDelete: () => setIsDelete(!isDelete),
                isDelete,
              }}
            />
            {activeTab !== TestimonialTabs.Share && (
              <TestimonialFilter
                filters={filters}
                setFilters={setFilters}
                activeTab={activeTab}
                setType={setType}
              />
            )}
          </div>

          <TabsContent value={TestimonialTabs.Select} className="flex-1">
            <TestimonialSelect
              selectedTestimonialIds={selectedTestimonialIds}
              setSelectedTestimonialIds={setSelectedTestimonialIds}
              filters={filters}
              type={type}
            />
          </TabsContent>

          <TabsContent value={TestimonialTabs.Edit} className="flex-1">
            <TestimonialEdit
              currentStyle={collection?.theme!}
              testimonials={collection?.testimonials ?? []}
              filters={filters}
              isDelete={isDelete}
              type={type}
              selectedTestimonialIds={selectedTestimonialIds}
              setSelectedTestimonialIds={setSelectedTestimonialIds}
              setFilters={setFilters}
            />
          </TabsContent>

          <TabsContent value={TestimonialTabs.Share} className="flex-1">
            <TestimonialShare
              selectedTestimonials={collection?.testimonials ?? []}
              currentStyle={collection?.theme!}
            />
          </TabsContent>
        </div>
      </Tabs>

      <TestimonialEditModal
        theme={collection?.theme}
        onClose={() => setOpenedEdit(false)}
        opened={openedEdit}
      />
    </div>
  );
}

interface UtilityComponentProps {
  selectedTestimonialIds: string[];
  setSelectedTestimonialIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeTab: TestimonialTabs | null;
  setActiveTab: React.Dispatch<React.SetStateAction<TestimonialTabs | null>>;
  filteredTestimonialIds: string[] | undefined;
  openEdit: () => void;
  toggleDelete: () => void;
  isDelete: boolean;
}

function UtilityComponent({
  selectedTestimonialIds,
  setSelectedTestimonialIds,
  activeTab,
  setActiveTab,
  filteredTestimonialIds,
  openEdit,
  toggleDelete,
  isDelete,
}: UtilityComponentProps) {
  const params = useParams({
    strict: false,
  });
  const collectionId = params?.collectionId as string;
  const addMultipleTestimonials = useAddMultipleTestimonialsToCollection(collectionId);
  const deletedTestimonialsMutation = useDeleteMultipleTestimonialsFromCollection(collectionId);
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);
  const savedTestimonialIds = collection?.testimonials?.map((t) => t.id);
  const [openedShare, setOpenedShare] = useState(false);
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  const handleSave = () => {
    addMultipleTestimonials.mutate(selectedTestimonialIds, {
      onSuccess: () => {
        setSelectedTestimonialIds([]);
        setActiveTab(TestimonialTabs.Edit);
      },
    });
  };

  const handleDelete = async () => {
    const shouldDelete = await confirm({
      title: translations("Delete testimonials?"),
      description: translations("Are you sure to delete these testimonials?"),
      confirmText: translations("Delete"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDelete) return;

    deletedTestimonialsMutation.mutate(selectedTestimonialIds, {
      onSuccess: () => {
        toggleDelete();
      },
    });
  };

  const testimonialIdsNotInCollection = filteredTestimonialIds?.filter(
    (t) => !savedTestimonialIds?.includes(t),
  );

  function filterAndSelectTestimonialIds(checked: boolean) {
    if (checked) setSelectedTestimonialIds(testimonialIdsNotInCollection ?? []);
    else setSelectedTestimonialIds([]);
  }

  const isAllSelected = testimonialIdsNotInCollection?.every((t) =>
    selectedTestimonialIds?.includes(t),
  );
  const isAllSelectedForDelete = savedTestimonialIds?.every((t) =>
    selectedTestimonialIds?.includes(t),
  );

  useEffect(() => {
    if (!isDelete && activeTab === TestimonialTabs.Edit) setSelectedTestimonialIds([]);
  }, [isDelete, activeTab]);

  return (
    <div className="border rounded-lg p-3 space-y-3">
      {activeTab === TestimonialTabs.Edit && (
        <>
          {isDelete && (
            <Field orientation="horizontal" className="gap-2">
              <Checkbox
                id="select-all-delete"
                checked={isAllSelectedForDelete}
                disabled={!savedTestimonialIds?.length}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedTestimonialIds(savedTestimonialIds);
                  else setSelectedTestimonialIds([]);
                }}
              />
              <FieldLabel
                htmlFor="select-all-delete"
                className="text-sm font-medium cursor-pointer"
              >
                {translations("Select All")}
              </FieldLabel>
            </Field>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={openEdit}
            disabled={!savedTestimonialIds?.length}
            className="w-full justify-start"
          >
            <IconPencil size={16} className="mr-2" />
            {translations("Customize")}
          </Button>

          <Button
            size="sm"
            variant={isDelete ? "destructive" : "outline"}
            onClick={!isDelete ? toggleDelete : handleDelete}
            disabled={!filteredTestimonialIds?.length}
            className="w-full justify-start"
          >
            <IconTrash size={16} className="mr-2" />
            {translations("Delete")}
          </Button>

          {isDelete && (
            <Button size="sm" variant="default" onClick={toggleDelete} className="w-full">
              {translations("Cancel")}
            </Button>
          )}
        </>
      )}

      {activeTab === TestimonialTabs.Select && (
        <>
          <Field orientation="horizontal" className="gap-2">
            <Checkbox
              id="select-all"
              checked={isAllSelected}
              disabled={!filteredTestimonialIds?.length}
              onCheckedChange={filterAndSelectTestimonialIds}
            />
            <FieldLabel htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              {translations("Select All")}
            </FieldLabel>
          </Field>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={!filteredTestimonialIds?.length}
            className="w-full justify-start"
          >
            <IconDeviceFloppy size={16} className="mr-2" />
            {translations("Save and Next")}
          </Button>
        </>
      )}

      {activeTab === TestimonialTabs.Share && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpenedShare(true)}
            disabled={!savedTestimonialIds?.length}
            className="w-full justify-start"
          >
            <IconShare size={16} className="mr-2" />
            {translations("Share")}
          </Button>
        </>
      )}

      <TestimonialShareModal
        opened={openedShare}
        onClose={() => setOpenedShare(false)}
        collectionId={collectionId}
      />
    </div>
  );
}
