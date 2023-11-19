import Banner from "../../components/Banner";
import HeroSection from "./HeroSection";
import OurFeaturesSection from "./OurFeaturesSection";
import OurSolutionsSection from "./OursolutionsSection";

function Home() {
  return (
    <>
      <HeroSection />
      <OurSolutionsSection />
      <OurFeaturesSection />
      <Banner text={"Elevate Your Experience, Gauge Your Satisfaction!"} />
    </>
  );
}

export default Home;
