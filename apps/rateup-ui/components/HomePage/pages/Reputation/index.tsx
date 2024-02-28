import HeroSection from "./HeroSection";
import OurFeatures from "./OurFeatures";
import WhyChooseRateupSection from "./WhyChooseRateupSection";
import Head from "next/head";
import styles from "./Reputation.module.css";

function Reputation() {
  return (
    <>
      <Head>
        <title>
          Online reputation management - Review analysis 2024 | RateUp
        </title>
        <meta
          name="keywords"
          content="Online reputation management, review analysis, review tracking, sentiment analysis, customer feedback analysis"
        />
        <meta
          name="description"
          content="Enhance your online presence with RateUp's reputation management. Leverage the Review Analysis Tool for a comprehensive digital boost. Book a demo!
          "
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
    </>
  );
}

export default Reputation;
