import HeroSection from "./HeroSection";
import OurFeatures from "./OurFeatures";
import WhyChooseRateupSection from "./WhyChooseRateupSection";
import Banner from "../Home/OursolutionsSection/Banner";
import Head from "next/head";
import styles from "./Reputation.module.css";

function Reputation() {
  return (
    <>
      <Head>
        <title>
          Rateup- We redefine the dynamics of online reputation management,
          providing businesses with a robust platform to not only enhance their
          Google reviews but also cultivate positive brand advocates
        </title>
        <meta
          name="keywords"
          content="Customer Engagement Platform, Online reputation management, Survey, Review, Whatsapp Survey, Feedback "
        />
        <meta
          name="description"
          content="Transforming Online Presence and Customer Experiences, We redefine the dynamics of online reputation management, providing businesses with a robust platform to not only enhance their Google reviews but also cultivate positive brand advocates"
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta property="og:url" content="https://rateup.app/reputation" />
        <meta
          property="og:title"
          content="Rateup - Online Reputation Management"
        />
        <meta
          property="og:description"
          content="Transforming Online Presence and Customer Experiences, We redefine the dynamics of online reputation management, providing businesses with a robust platform to not only enhance their Google reviews but also cultivate positive brand advocates"
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
      <OurFeatures />
      <WhyChooseRateupSection />
      <Banner
        className={styles["reputation-know-more-banner"]}
        text={"Ready to Elevate Your Brand? Sign Up with RateUp Today"}
      />
    </>
  );
}

export default Reputation;
