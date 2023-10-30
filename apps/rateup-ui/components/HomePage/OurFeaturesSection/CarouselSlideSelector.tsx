import { Tabs } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import ComboBox from "./ComboBox";
import styles from "./OurFeaturesSection.module.css";
import { onTabOrComboBoxChange, tabs } from "./constants";

function CarouselSlideSelector({ setActiveTab, activeTab }) {
  const isViewPortLeq768px = useMediaQuery("(max-width: 768px)");

  return (
    <>
      {isViewPortLeq768px ? (
        <ComboBox activeTab={activeTab} setActiveTab={setActiveTab} />
      ) : (
        <Tabs
          value={activeTab.value}
          onChange={onTabOrComboBoxChange(setActiveTab)}
          classNames={styles}
        >
          <Tabs.List>
            {tabs.map((tab) => {
              return (
                <Tabs.Tab value={tab.value} key={tab.value}>
                  {tab.label}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>
      )}
    </>
  );
}

export default CarouselSlideSelector;
