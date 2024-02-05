import { useState } from "react";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { Flex, Stack, Tabs } from "@mantine/core";
import Heading from "../../../components/styled/Heading/Heading";

import { useSurvey } from "../../../backend/surveys/surveys.query";

import { useRouter } from "next/router";
import TestimonialSelect from "../../../components/testimonial/TestimonialSelect";
import TestimonialEdit from "../../../components/testimonial/TestimonialEdit";
import TestimonialShare from "../../../components/testimonial/TestimonialShare";
import TestimonialFilter from "../../../components/testimonial/TestimonialFilter";
import { useListState } from "@mantine/hooks";
import SelectedTestimonialCollectionContext from "../../../context/SelectedCollectionContext";
import { TestimonialStyleType } from "../../../types/global";
import { useImmer } from "use-immer";

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
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const { data: survey } = useSurvey(surveyId);
  const [currentStyle, setCurrentstyle] = useImmer<TestimonialStyleType>({
    root: {
      bg: "#ffffff",
    },
    profileBlock: {
      bg: "#ffffff",
      profileName: {
        color: "#282828",
        fontSize: "18px",
        fontWeight: "700",
      },
      profilePos: {
        color: "#282828",
        fontSize: "16px",
        fontWeight: "500",
      },
      profilePic: {
        isRemoved: false,
      },
    },
    descBlock: {
      bg: "#ffffff",
      desc: {
        color: "#282828",
        fontSize: "16px",
        fontWeight: "400",
      },
    },
    ratingBlock: {
      bg: "#ffffff",
      isRemoved: false,
    },
    date: {
      color: "#282828",
      fontSize: "16px",
      fontWeight: "400",
      isRemoved: false,
    },
    layout: "horizontal",
  });

  const [filters, setFilters] = useState({
    date: "new",
    rating: null,
    testimonialLength: "longest",
  });

  return (
    <>
      <SelectedTestimonialCollectionContext.Provider
        value={{ selectedCollectionId }}
      >
        <Flex>
          <Stack>
            <Heading title={"Testimonials"} titleprops={{ tt: "capitalize" }} />
            <TestimonialFilter
              surveyId={surveyId}
              selectedCollectionId={selectedCollectionId}
              setSelectedCollection={setSelectedCollectionId}
              filters={filters}
              setFilters={setFilters}
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
                survey={survey}
                setActiveTab={setActiveTab}
                selectedTestimonials={selectedTestimonials}
                selectedTestimonialHandler={selectedTestimonialHandler}
                filters={filters}
              />
            </Tabs.Panel>
            <Tabs.Panel value={TestimonialTabs.Edit}>
              <TestimonialEdit
                selectedTestimonials={selectedTestimonials}
                setCurrentStyle={setCurrentstyle}
                currentStyle={currentStyle}
                selectedTestimonialHandler={selectedTestimonialHandler}
              />
            </Tabs.Panel>
            <Tabs.Panel value={TestimonialTabs.Share}>
              <TestimonialShare filters={filters} />
            </Tabs.Panel>
          </StyledTabs>
        </Flex>
      </SelectedTestimonialCollectionContext.Provider>
    </>
  );
}
