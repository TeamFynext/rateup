import styles from "./OurFeaturesSection.module.css";
import { Stack, Title } from "@mantine/core";
import { Carousel, Embla } from "@mantine/carousel";
import { useEffect, useState } from "react";
import CarouselSlideSelector from "./CarouselSlideSelector";
import { tabs } from "./constants";

function OurFeaturesSection() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [emblaInstance, setEmblaInstance] = useState<Embla | null>(null);

  useEffect(() => {
    if (emblaInstance) {
      emblaInstance.scrollTo(activeTab.index);
    }
  }, [emblaInstance, activeTab]);

  return (
    <Stack className={styles["our-features-container"]}>
      <Title>Our Features</Title>

      <CarouselSlideSelector
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <Carousel
        withIndicators
        height={200}
        classNames={styles}
        withControls={false}
        onSlideChange={(slideIndex) => setActiveTab(tabs[slideIndex])}
        getEmblaApi={setEmblaInstance}
      >
        <Carousel.Slide>
          <div>
            <h2>
              <span>Professional Templates </span>
              Create a Survey
            </h2>
          </div>
        </Carousel.Slide>
        <Carousel.Slide>
          <div>
            <h1>Reputation Management</h1>
          </div>
        </Carousel.Slide>
        <Carousel.Slide>
          <div>
            <h1>Loyalty</h1>
          </div>
        </Carousel.Slide>
      </Carousel>
    </Stack>
  );
}

export default OurFeaturesSection;
