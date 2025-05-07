import { useCallback, useEffect, useRef, useState } from "react";

import { Carousel } from "@mantine/carousel";
import { Flex, Tabs, Title } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { EmblaCarouselType } from "embla-carousel";

import {
  getTabIndexFromSurveyTypeStr,
  imageCarouselSlides,
  SurveyType,
} from "./constants";
import carouselStyles from "./ImageCarousel.module.css";
import styles from "./SurveyFeaturesCarousel.module.css";
import tabsStyles from "./SurveyTypeTabs.module.css";

function SurveyFeaturesCarousel() {
  const [activeTab, setActiveTab] = useState<SurveyType>(SurveyType.WebSurvey);

  const activeTabIndex = getTabIndexFromSurveyTypeStr(activeTab);
  const prevActiveTabIndex = useRef<number>(0);

  const [imageCarouselEmblaInstance, setImageCarouselEmblaInstance] =
    useState<EmblaCarouselType | null>(null);

  const videoElementsRef = useRef([]);

  const { ref: intersectionRef, entry } = useIntersection({
    threshold: 0.5,
  });

  useEffect(() => {
    if (entry) {
      const activeVideoEle = videoElementsRef.current[activeTabIndex];
      const prevActiveVideoEle =
        videoElementsRef.current[prevActiveTabIndex.current];
      if (prevActiveVideoEle) {
        prevActiveVideoEle.pause();
        prevActiveVideoEle.currentTime = 0;
      }
      switch (entry.isIntersecting) {
        case true: {
          activeVideoEle?.play();
          break;
        }
        case false: {
          if (activeVideoEle) {
            activeVideoEle.pause();
            activeVideoEle.currentTime = 0;
          }
          break;
        }
      }
    }
  }, [entry, activeTab]);

  useEffect(() => {
    if (imageCarouselEmblaInstance) {
      if (activeTabIndex !== -1)
        imageCarouselEmblaInstance.scrollTo(activeTabIndex);
    }
  }, [imageCarouselEmblaInstance, activeTab]);

  const updateActiveTabState = useCallback(
    (activeTab) => {
      prevActiveTabIndex.current = activeTabIndex;
      setActiveTab(activeTab);
    },
    [activeTab],
  );

  const handleActiveTabChange = useCallback(
    (activeTab: SurveyType) => {
      updateActiveTabState(activeTab);
    },
    [activeTab],
  );

  const handleImageCarouselSlideChange = useCallback(
    (slideIndex) => {
      const surveyTypesArray = Object.values(SurveyType);
      const activeSurveyType = surveyTypesArray[slideIndex];
      updateActiveTabState(activeSurveyType);
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
            For businesses with complex structures, our platform offers
            multi-organizational support. Streamline customer experience
            management across various departments and locations effortlessly.
          </Tabs.Panel>
          <Tabs.Panel value={SurveyType.WhatsappSurvey}>
            For businesses with complex structures, our platform offers
            multi-organizational support. Streamline customer experience
            management across various departments and locations effortlessly.
          </Tabs.Panel>
          <Tabs.Panel value={SurveyType.GroupSurvey}>
            For businesses with complex structures, our platform offers
            multi-organizational support. Streamline customer experience
            management across various departments and locations effortlessly.
          </Tabs.Panel>
        </Tabs>
      </Flex>
      <Flex className={styles["illustrative-videos-carousel-container"]}>
        <Carousel
          classNames={carouselStyles}
          getEmblaApi={setImageCarouselEmblaInstance}
          height="100%"
          withControls={false}
          withIndicators
          onSlideChange={handleImageCarouselSlideChange}
          ref={intersectionRef}
        >
          {imageCarouselSlides.map(({ id, srcsArray, name }, index) => {
            return (
              <Carousel.Slide key={id}>
                <video
                  className={`${styles["illustration-txt-section-video"]}`}
                  muted
                  ref={(element) => {
                    videoElementsRef.current[index] = element;
                  }}
                >
                  {srcsArray.map(({ type, src }) => {
                    return <source key={type} src={src} type={type}></source>;
                  })}
                </video>
              </Carousel.Slide>
            );
          })}
        </Carousel>
      </Flex>
    </Flex>
  );
}

export default SurveyFeaturesCarousel;
