import { useEffect, useState } from "react";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { Flex, Stack, Tabs } from "@mantine/core";
import Heading from "../../../components/styled/Heading/Heading";
import { useRouter } from "next/router";
import TestimonialSelect from "../../../components/testimonial/TestimonialSelect";
import TestimonialEdit from "../../../components/testimonial/TestimonialEdit";
import TestimonialShare from "../../../components/testimonial/TestimonialShare";
import TestimonialFilter from "../../../components/testimonial/TestimonialFilter";
import { useListState } from "@mantine/hooks";
import SelectedTestimonialCollectionContext from "../../../context/SelectedCollectionContext";
import { TestimonialStyleType } from "../../../types/global";
import { useImmer } from "use-immer";
import { useGetAllTestimonialsByCollection } from "../../../backend/testimonials/testimonial.query";
import { useRouteParams } from "../../../context/RouteParamsContext";
import { defaultTestimonialStyle } from "../../../utils/testimonial";

export enum TestimonialTabs {
  Select = "Select",
  Edit = "Edit",
  Share = "Share",
}
export default function () {
  const [activeTab, setActiveTab] = useState<TestimonialTabs | null>(
    TestimonialTabs.Select,
  );
  const [selectedTestimonials, selectedTestimonialHandler] = useListState([]);

  const router = useRouter();
  const { collectionId } = router.query as { collectionId: string };
  const [selectedCollectionId, setSelectedCollectionId] =
    useState(collectionId);
  const { data: collection, refetch } =
    useGetAllTestimonialsByCollection(selectedCollectionId);
  const surveyId = collection?.surveyTeamMap?.surveyId;

  const [currentStyle, setCurrentstyle] = useImmer<TestimonialStyleType>(
    defaultTestimonialStyle,
  );
  const [filters, setFilters] = useState({
    date: "new",
    rating: null,
    testimonialLength: "longest",
  });
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const { update } = useRouteParams();
  useEffect(() => {
    refetch();
    update({ collectionId: collection?.name });
    selectedTestimonialHandler.setState(
      collection?.testimonials.map((t) => t.testimonial),
    );
    setCurrentstyle(collection?.theme);
  }, [selectedCollectionId, collection, activeTab]);

  useEffect(() => {
    setSelectedCollectionId(collectionId);
  }, [collectionId]);

  return (
    <>
      <SelectedTestimonialCollectionContext.Provider
        value={{ selectedCollectionId }}
      >
        <Flex>
          <Stack>
            <Heading title={"Testimonials"} titleprops={{ tt: "capitalize" }} />
            <TestimonialFilter
              selectedCollectionId={selectedCollectionId}
              setSelectedCollection={setSelectedCollectionId}
              filters={filters}
              setFilters={setFilters}
              selectedTeamId={selectedTeamId}
              setSelectedTeamId={setSelectedTeamId}
              activeTab={activeTab}
            />
          </Stack>
          <StyledTabs
            value={activeTab}
            onChange={(value) => setActiveTab(value as TestimonialTabs)}
            w={"100%"}
            px={"xl"}
          >
            <Tabs.List>
              <Tabs.Tab px={70} value={TestimonialTabs.Select}>
                Select
              </Tabs.Tab>
              <Tabs.Tab px={70} value={TestimonialTabs.Edit}>
                Edit
              </Tabs.Tab>
              <Tabs.Tab px={70} value={TestimonialTabs.Share}>
                Share
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value={TestimonialTabs.Select} pt={"xl"}>
              <TestimonialSelect
                surveyId={surveyId}
                setActiveTab={setActiveTab}
                selectedTestimonials={selectedTestimonials}
                selectedTestimonialHandler={selectedTestimonialHandler}
                filters={filters}
                selectedTeamId={selectedTeamId}
              />
            </Tabs.Panel>
            <Tabs.Panel value={TestimonialTabs.Edit}>
              <TestimonialEdit
                selectedTestimonials={selectedTestimonials}
                setCurrentStyle={setCurrentstyle}
                currentStyle={currentStyle}
                selectedTestimonialHandler={selectedTestimonialHandler}
                setActiveTab={setActiveTab}
                filters={filters}
              />
            </Tabs.Panel>
            <Tabs.Panel value={TestimonialTabs.Share}>
              <TestimonialShare
                selectedTestimonials={selectedTestimonials}
                currentStyle={currentStyle}
              />
            </Tabs.Panel>
          </StyledTabs>
        </Flex>
      </SelectedTestimonialCollectionContext.Provider>
    </>
  );
}
