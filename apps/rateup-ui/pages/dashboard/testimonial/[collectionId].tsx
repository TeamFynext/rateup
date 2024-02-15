import { useEffect, useState } from "react";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { Stack, Tabs, Group, Paper, Checkbox, Button } from "@mantine/core";
import Heading from "../../../components/styled/Heading/Heading";
import { useRouter } from "next/router";
import TestimonialSelect from "../../../components/testimonial/TestimonialSelect";
import TestimonialEdit from "../../../components/testimonial/TestimonialEdit";
import TestimonialShare, {
  TestimonialShareModal,
} from "../../../components/testimonial/TestimonialShare";
import TestimonialFilter from "../../../components/testimonial/TestimonialFilter";
import { Testimonial, TestimonialStyleType } from "../../../types/global";
import { useImmer } from "use-immer";
import {
  useAddMultipleTestimonialsToCollection,
  useGetAllTestimonialsByCollection,
  useGetAllTestimonialsByOrg,
  useUpdateCollection,
} from "../../../backend/testimonials/testimonial.query";
import { useRouteParams } from "../../../context/RouteParamsContext";
import {
  defaultTestimonialStyle,
  getFilteredTestimonials,
} from "../../../utils/testimonial";
import { useDisclosure } from "@mantine/hooks";
import TestimonialEditModal from "../../../components/testimonial/TestimonialEditModal";
import {
  IconDeviceFloppy,
  IconPencil,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";

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
export default function () {
  const { update } = useRouteParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TestimonialTabs | null>(
    TestimonialTabs.Select,
  );
  const [selectedTestimonialIds, setSelectedTestimonialIds] = useState<
    string[]
  >([]);
  const [isDelete, { toggle: toggleDelete }] = useDisclosure(false);
  const { collectionId } = router.query as { collectionId: string };
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);
  const [currentStyle, setCurrentstyle] = useImmer<TestimonialStyleType>(
    defaultTestimonialStyle,
  );
  const [filters, setFilters] = useState<filterType>({
    date: "new",
    rating: null,
    length: "longest",
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

  // useEffect(() => {
  //   update({ collectionId: collection?.name });
  //   setSelectedTestimonialIds(collection?.testimonials?.map((t) => t.id));
  //   setCurrentstyle(collection?.theme);
  // }, [collection]);
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
            currentStyle={currentStyle}
            testimonials={collection?.testimonials}
            filters={filters}
            isDelete={isDelete}
            type={type}
            toggleDelete={toggleDelete}
          />
        </Tabs.Panel>
        <Tabs.Panel value={TestimonialTabs.Share}>
          <TestimonialShare
            selectedTestimonials={collection?.testimonials}
            currentStyle={currentStyle}
          />
        </Tabs.Panel>

        <Stack gap="xs" miw={200} maw={200} h="100%">
          <UtilityComponent
            {...{
              activeTab,
              selectedTestimonialIds,
              setActiveTab,
              setSelectedTestimonialIds,
              filteredTestimonialIds,
              openEdit,
              toggleDelete,
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
      </Group>
      <TestimonialEditModal
        setCurrentstyle={setCurrentstyle}
        currentStyle={currentStyle}
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
}
function UtilityComponent({
  selectedTestimonialIds,
  setSelectedTestimonialIds,
  activeTab,
  setActiveTab,
  filteredTestimonialIds,
  openEdit,
  toggleDelete,
}: UtilityComponentProps) {
  const { collectionId } = useRouter().query as { collectionId: string };
  const updateTestimonialCollection = useUpdateCollection(collectionId);
  const addMultipleTestimonials =
    useAddMultipleTestimonialsToCollection(collectionId);
  const handleNext = () => {
    addMultipleTestimonials.mutate(selectedTestimonialIds);
    // updateTestimonialCollection.mutate(
    //   {
    //     data: { testimonialIds: selectedTestimonialIds },
    //     collectionId: collectionId,
    //   },
    //   {
    //     onSuccess: () => {
    //       setActiveTab(TestimonialTabs.Edit);
    //     },
    //   }
    // );
  };
  const { data: collection } = useGetAllTestimonialsByCollection(collectionId);
  //this function is used to check if the selected testimonial ids are already present in the collection
  function filterAndSelectTestimonialIds(e) {
    const savedTestimonialIds = collection?.testimonials?.map((t) => t.id);
    const testimonialIdsNotInCollection = filteredTestimonialIds.filter(
      (t) => !savedTestimonialIds.includes(t),
    );
    if (e.currentTarget.checked)
      setSelectedTestimonialIds(testimonialIdsNotInCollection);
    else setSelectedTestimonialIds([]);
  }
  const isAllSelected =
    filteredTestimonialIds?.length &&
    filteredTestimonialIds?.every((t) => selectedTestimonialIds?.includes(t));
  const [openedShare, { open: openShare, close: closeShare }] =
    useDisclosure(false);
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack>
        {activeTab === TestimonialTabs.Edit && (
          <>
            <Button
              size="compact-xs"
              radius="md"
              variant="light"
              onClick={openEdit}
              disabled={!filteredTestimonialIds?.length}
              leftSection={<IconPencil size={"1rem"} />}
            >
              Edit
            </Button>
            <Button
              size="compact-xs"
              radius="md"
              variant="light"
              color="red"
              onClick={toggleDelete}
              disabled={!filteredTestimonialIds?.length}
              leftSection={<IconTrash size={"1rem"} />}
            >
              Delete
            </Button>
          </>
        )}
        {activeTab === TestimonialTabs.Select && (
          <>
            <Checkbox
              label={"Select All"}
              size="xs"
              checked={isAllSelected}
              disabled={!filteredTestimonialIds?.length}
              onChange={filterAndSelectTestimonialIds}
            />
            <Button
              size="compact-xs"
              radius="md"
              variant="light"
              onClick={handleNext}
              disabled={!filteredTestimonialIds?.length}
              leftSection={<IconDeviceFloppy size={"1rem"} />}
            >
              Save and Next
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
              leftSection={<IconShare size={"1rem"} />}
            >
              Share
            </Button>
          </>
        )}
      </Stack>
      <TestimonialShareModal
        opened={openedShare}
        onClose={closeShare}
        collectionId={collectionId}
      />
    </Paper>
  );
}
