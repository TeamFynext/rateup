import { useEffect, useState } from "react";

import { Button, Checkbox, Group, Paper, Stack, Tabs } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDeviceFloppy,
  IconPencil,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import {
  createFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
  useAddMultipleTestimonialsToCollection,
  useDeleteMultipleTestimonialsFromCollection,
  useGetAllTestimonialsByCollection,
  useGetAllTestimonialsByOrg,
} from "@/backend/testimonials/testimonial.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal.tsx";
import Heading from "@/components/styled/Heading/Heading.tsx";
import StyledTabs from "@/components/styled/StyledTabs/StyledTabs.tsx";
import TestimonialEdit from "@/components/testimonial/TestimonialEdit.tsx";
import TestimonialEditModal from "@/components/testimonial/TestimonialEditModal.tsx";
import TestimonialFilter from "@/components/testimonial/TestimonialFilter.tsx";
import TestimonialSelect from "@/components/testimonial/TestimonialSelect.tsx";
import TestimonialShare, {
  TestimonialShareModal,
} from "@/components/testimonial/TestimonialShare.tsx";
import { getFilteredTestimonials } from "@/utils/testimonial.ts";

import { useRouteParams } from "@/context/RouteParamsContext.tsx";


export const Route = createFileRoute("/dashboard/testimonial/$collectionId/")({
  component: CollectionById,
});

export enum TestimonialTabs {
  Select = "Select",
  Edit = "Edit",
  Share = "Share",
}
export type filterType = {
  date: "new" | "old";
  rating: number;
  length: "longest" | "shortest";
  teams: string[];
  surveys: string[];
};

function CollectionById() {
  const { update } = useRouteParams();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const params = useParams({
    strict: false,
  });

  const tab = searchParams.tab;
  const [activeTab, setActiveTab] = useState<TestimonialTabs | null>(
    TestimonialTabs.Select,
  );
  const [selectedTestimonialIds, setSelectedTestimonialIds] = useState<
    string[]
  >([]);
  const [isDelete, { toggle: toggleDelete }] = useDisclosure(false);
  const collectionId = params?.collectionId as string;
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);
  const [filters, setFilters] = useState<filterType>({
    date: null,
    rating: null,
    length: null,
    surveys: [],
    teams: [],
  });
  const [type, setType] = useState("date");

  const { data: alltestimonials, isLoading: isTestimonialLoading } =
    useGetAllTestimonialsByOrg();
  const filteredTestimonials = getFilteredTestimonials(
    alltestimonials,
    filters,
    type,
  );
  const filteredTestimonialIds = filteredTestimonials?.map((t) => t.id);

  const [openedEdit, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);

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
    <StyledTabs
      value={activeTab}
      onChange={(value) => setActiveTab(value as TestimonialTabs)}
      p="lg"
      styles={{ root: { flex: 1 } }}
    >
      <Group>
        <Heading title={"Testimonials"} titleprops={{ tt: "capitalize" }} />
        <Tabs.List>
          <Tabs.Tab value={TestimonialTabs.Select}>
            {TestimonialTabs.Select}
          </Tabs.Tab>
          <Tabs.Tab value={TestimonialTabs.Edit}>
            {TestimonialTabs.Edit}
          </Tabs.Tab>
          <Tabs.Tab value={TestimonialTabs.Share}>
            {TestimonialTabs.Share}
          </Tabs.Tab>
        </Tabs.List>
      </Group>
      <Group gap="sm" h="85vh">
        <Stack gap="xs" miw={200} maw={200} h="100%" py={"sm"}>
          <UtilityComponent
            {...{
              activeTab,
              selectedTestimonialIds,
              setActiveTab,
              setSelectedTestimonialIds,
              filteredTestimonialIds,
              openEdit,
              toggleDelete,
              isDelete,
            }}
          />
          {activeTab != TestimonialTabs.Share && (
            <TestimonialFilter
              filters={filters}
              setFilters={setFilters}
              activeTab={activeTab}
              setType={setType}
            />
          )}
        </Stack>
        <Tabs.Panel value={TestimonialTabs.Select}>
          <TestimonialSelect
            selectedTestimonialIds={selectedTestimonialIds}
            setSelectedTestimonialIds={setSelectedTestimonialIds}
            filters={filters}
            type={type}
          />
        </Tabs.Panel>
        <Tabs.Panel value={TestimonialTabs.Edit}>
          <TestimonialEdit
            currentStyle={collection?.theme}
            testimonials={collection?.testimonials}
            filters={filters}
            isDelete={isDelete}
            type={type}
            selectedTestimonialIds={selectedTestimonialIds}
            setSelectedTestimonialIds={setSelectedTestimonialIds}
            setFilters={setFilters}
          />
        </Tabs.Panel>
        <Tabs.Panel value={TestimonialTabs.Share}>
          <TestimonialShare
            selectedTestimonials={collection?.testimonials}
            currentStyle={collection?.theme}
          />
        </Tabs.Panel>
      </Group>
      <TestimonialEditModal
        theme={collection?.theme}
        onClose={closeEdit}
        opened={openedEdit}
      />
    </StyledTabs>
  );
}

interface UtilityComponentProps {
  selectedTestimonialIds: string[];
  setSelectedTestimonialIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeTab: TestimonialTabs;
  setActiveTab: React.Dispatch<React.SetStateAction<TestimonialTabs>>;
  filteredTestimonialIds: string[];
  openEdit: () => void;
  toggleDelete;
  isDelete;
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
  const addMultipleTestimonials =
    useAddMultipleTestimonialsToCollection(collectionId);
  const deletedTestimonialsMutation =
    useDeleteMultipleTestimonialsFromCollection(collectionId);
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);
  const savedTestimonialIds = collection?.testimonials?.map((t) => t.id);
  const [dialogOpened, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);
  const [openedShare, { open: openShare, close: closeShare }] =
    useDisclosure(false);
  const { t: translations } = useTranslation();
  const handleSave = () => {
    addMultipleTestimonials.mutate(selectedTestimonialIds, {
      onSuccess: () => {
        setSelectedTestimonialIds([]);
        setActiveTab(TestimonialTabs.Edit);
      },
    });
  };
  const handleDelete = () => {
    deletedTestimonialsMutation.mutate(selectedTestimonialIds, {
      onSuccess: () => {
        toggleDelete();
      },
    });
  };
  const testimonialIdsNotInCollection = filteredTestimonialIds?.filter(
    (t) => !savedTestimonialIds?.includes(t),
  );
  // this function is used to check if the selected testimonial ids are already present in the collection
  function filterAndSelectTestimonialIds(e) {
    if (e.currentTarget.checked)
      setSelectedTestimonialIds(testimonialIdsNotInCollection);
    else setSelectedTestimonialIds([]);
  }

  const isAllSelected = testimonialIdsNotInCollection?.every((t) =>
    selectedTestimonialIds?.includes(t),
  );
  const isAllSelectedForDelete = savedTestimonialIds?.every((t) =>
    selectedTestimonialIds?.includes(t),
  );

  useEffect(() => {
    if (!isDelete && activeTab == TestimonialTabs.Edit)
      setSelectedTestimonialIds([]);
  }, [isDelete, activeTab]);

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack>
        {activeTab === TestimonialTabs.Edit && (
          <>
            {isDelete && (
              <Checkbox
                label={translations("Select All")}
                size="xs"
                checked={isAllSelectedForDelete}
                disabled={!savedTestimonialIds?.length}
                onChange={(e) => {
                  if (e.currentTarget.checked)
                    setSelectedTestimonialIds(savedTestimonialIds);
                  else setSelectedTestimonialIds([]);
                }}
              />
            )}
            <Button
              size="compact-xs"
              radius="md"
              variant="light"
              onClick={openEdit}
              disabled={!savedTestimonialIds?.length}
              leftSection={<IconPencil size={"1rem"} />}
            >
              {translations("Customize")}
            </Button>

            <Button
              size="compact-xs"
              radius="md"
              variant={isDelete ? "filled" : "light"}
              color="red"
              onClick={!isDelete ? toggleDelete : openDialog}
              disabled={!filteredTestimonialIds?.length}
              leftSection={<IconTrash size={"1rem"} />}
            >
              {translations("Delete")}
            </Button>
            {isDelete && (
              <Button
                size="compact-xs"
                radius="md"
                variant="filled"
                onClick={toggleDelete}
              >
                {translations("Cancel")}
              </Button>
            )}
          </>
        )}

        {activeTab === TestimonialTabs.Select && (
          <>
            <Checkbox
              label={translations("Select All")}
              size="xs"
              checked={isAllSelected}
              disabled={!filteredTestimonialIds?.length}
              onChange={filterAndSelectTestimonialIds}
            />
            <Button
              size="compact-xs"
              radius="md"
              variant="light"
              onClick={handleSave}
              disabled={!filteredTestimonialIds?.length}
              leftSection={<IconDeviceFloppy size={"1rem"} />}
            >
              {translations("Save and Next")}
            </Button>
          </>
        )}
        {activeTab === TestimonialTabs.Share && (
          <>
            <Button
              size="compact-xs"
              radius="md"
              variant="light"
              onClick={openShare}
              disabled={!savedTestimonialIds?.length}
              leftSection={<IconShare size={"1rem"} />}
            >
              {translations("Share")}
            </Button>
          </>
        )}
      </Stack>
      <TestimonialShareModal
        opened={openedShare}
        onClose={closeShare}
        collectionId={collectionId}
      />
      <ConfirmationModal
        forDeleteFunctionality
        confirmLabel={translations("Delete")}
        headerLabel={translations("Are you sure to delete these testimonials?")}
        headerTitle={translations("Delete testimonials?")}
        opened={dialogOpened}
        onClose={closeDialog}
        onConfirm={(e) => {
          handleDelete();
        }}
      />
    </Paper>
  );
}

