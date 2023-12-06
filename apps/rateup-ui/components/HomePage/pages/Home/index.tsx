import Banner from "../../components/Banner";
import HeroSection from "./HeroSection";
import OurFeaturesSection from "./OurFeaturesSection";
import OurSolutionsSection from "./OursolutionsSection";
import Head from "next/head";

function Home() {
  return (
    <>
      <Head>
        <title>
          Rateup - With Rate Up's Customer Engagement Platform, you can connect
          with, interact with, and expand your customer connections.
        </title>
        <meta
          name="keywords"
          content="Customer Engagement Platform, Online reputation management, Survey, Review, Whatsapp Survey, Feedback "
        />
        <meta
          name="description"
          content="Boost Your Credibility 
          & Get Rated Up
          With Rate Up's Customer Engagement Platform, you can connect
          with, interact with, and expand your customer connections."
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta property="og:url" content="https://www.rateup.app/" />
        <meta property="og:title" content="Rateup" />
        <meta
          property="og:description"
          content="Rateup - With Rate Up's Customer Engagement Platform, you can connect
          with, interact with, and expand your customer connections."
        />
        <meta
          property="og:image"
          content="https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png"
        />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1086" />
        <meta property="og:image:height" content="832" />
        <meta property="og:image:alt" content="Star Icon" />
      </Head>
      <HeroSection />
      <OurSolutionsSection />
      <OurFeaturesSection />
      <Banner text={"Elevate Your Experience, Gauge Your Satisfaction!"} />
    </>
  );
}

export default Home;
