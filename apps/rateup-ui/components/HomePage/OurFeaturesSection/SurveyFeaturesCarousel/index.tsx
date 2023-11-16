import { useCallback, useEffect, useState } from "react";
import { Flex, Tabs, Title } from "@mantine/core";
import { Carousel, Embla } from "@mantine/carousel";
import styles from "./SurveyFeaturesCarousel.module.css";
import carouselStyles from "./ImageCarousel.module.css";
import tabsStyles from "./SurveyTypeTabs.module.css";
import Image from "next/image";

enum SurveyType {
  WebSurvey = "web-survey",
  WhatsappSurvey = "whatsapp-survey",
  GroupSurvey = "group-survey",
}

const imagesPath = "/images/homepage/our-features";
const imageCarouselSlides = [
  {
    id: 1,
    src: `${imagesPath}/web-survey.png`,
    name: "Web Survey Illustration",
  },
  {
    id: 2,
    src: `${imagesPath}/whatsapp-survey.png`,
    name: "Whatsapp Survey Illustration",
  },
  {
    id: 3,
    src: `${imagesPath}/group-survey.png`,
    name: "Group Survey Illustration",
  },
];

function SurveyFeaturesCarousel() {
  const [activeTab, setActiveTab] = useState<SurveyType>(SurveyType.WebSurvey);
  const [imageCarouselEmblaInstance, setImageCarouselEmblaInstance] =
    useState<Embla | null>(null);

  useEffect(() => {
    if (imageCarouselEmblaInstance) {
      const activeTabIndex = Object.values(SurveyType)?.findIndex(
        (value) => value === activeTab,
      );
      if (activeTabIndex !== -1)
        imageCarouselEmblaInstance.scrollTo(activeTabIndex);
    }
  }, [imageCarouselEmblaInstance, activeTab]);

  const handleActiveTabChange = useCallback(
    (activeTab: SurveyType) => {
      setActiveTab(activeTab);
    },
    [activeTab],
  );

  const handleImageCarouselSlideChange = useCallback(
    (slideIndex) => {
      const surveyTypesArray = Object.values(SurveyType);
      const activeSurveyType = surveyTypesArray[slideIndex];
      setActiveTab(activeSurveyType);
    },
    [activeTab],
  );

  return (
    <Flex className={styles["survey-features-carousel-container"]}>
      <Flex className={styles["description-tabs-container"]}>
        <Title order={1}>Multi-Organizational Structure</Title>

        <Tabs
          classNames={tabsStyles}
          value={activeTab}
          onChange={handleActiveTabChange}
        >
          <Tabs.List>
            <Tabs.Tab value={SurveyType.WebSurvey}>Web Survey</Tabs.Tab>
            <Tabs.Tab value={SurveyType.WhatsappSurvey}>
              Whatsapp Survey
            </Tabs.Tab>
            <Tabs.Tab value={SurveyType.GroupSurvey}>Group Survey</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={SurveyType.WebSurvey}>
            Web Survey
            <br />
            For businesses with complex structures, our platform offers
            multi-organizational support. Streamline customer experience
            management across various departments and locations effortlessly.
          </Tabs.Panel>
          <Tabs.Panel value={SurveyType.WhatsappSurvey}>
            Whatsapp Survey
            <br />
            For businesses with complex structures, our platform offers
            multi-organizational support. Streamline customer experience
            management across various departments and locations effortlessly.
          </Tabs.Panel>
          <Tabs.Panel value={SurveyType.GroupSurvey}>
            Group Survey
            <br />
            For businesses with complex structures, our platform offers
            multi-organizational support. Streamline customer experience
            management across various departments and locations effortlessly.
          </Tabs.Panel>
        </Tabs>
      </Flex>
      <Flex className={styles["illustrative-images-carousel-container"]}>
        <Carousel
          classNames={carouselStyles}
          getEmblaApi={setImageCarouselEmblaInstance}
          height="100%"
          withControls={false}
          withIndicators
          onSlideChange={handleImageCarouselSlideChange}
          speed={10}
        >
          {imageCarouselSlides.map(({ id, src, name }) => {
            return (
              <Carousel.Slide key={id}>
                <Image
                  className={styles["feature-illustration-img"]}
                  src={src}
                  alt={name}
                  width={2820}
                  height={2052}
                />
              </Carousel.Slide>
            );
          })}
        </Carousel>
      </Flex>
    </Flex>
  );
}

export default SurveyFeaturesCarousel;
