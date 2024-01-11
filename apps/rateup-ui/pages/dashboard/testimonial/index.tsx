import { useState } from "react";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { Flex, Stack, Tabs } from "@mantine/core";
import Heading from "../../../components/styled/Heading/Heading";

enum TestimonialTabs {
  Review = "Review",
  Published = "Published",
}
export default function () {
  const [activeTab, setActiveTab] = useState<TestimonialTabs | null>(
    TestimonialTabs.Review,
  );
  return (
    <>
      <StyledTabs
        value={activeTab}
        onChange={(value) => setActiveTab(value as TestimonialTabs)}
      >
        <Tabs.List>
          <Tabs.Tab value={TestimonialTabs.Review}>Review</Tabs.Tab>
          <Tabs.Tab value={TestimonialTabs.Published}>Published</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={TestimonialTabs.Review}>
          <Stack>
            <Flex>
              <Heading
                title={"Testimonials"}
                titleprops={{ tt: "capitalize" }}
              />
            </Flex>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value={TestimonialTabs.Published}>
          <>published</>
        </Tabs.Panel>
      </StyledTabs>
    </>
  );
}
