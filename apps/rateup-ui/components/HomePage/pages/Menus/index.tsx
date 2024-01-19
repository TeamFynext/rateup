import HeroSection from "./HeroSection";
import RateupInAction from "./RateupInAction";
import SimplicityRefined from "./SimplicityRefined";
import HowItWorks from "./HowItWorks";
import Head from "next/head";

function Menus() {
  return (
    <>
      <Head>
        <title>Digital Menu Boards - Easy to use & share | RateUp</title>
        <meta
          name="keywords"
          content="Online reputation, Google review importance, Rateup blog, Customer satisfaction "
        />
        <meta
          name="description"
          content="Craft restaurant menus effortlessly with RateUp. Tailor for your brand, simplify sharing with QR codes. Experience the ease - Book a demo!
          "
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta property="og:url" content="https://rateup.app/menus" />
        <meta property="og:title" content="Rateup - Digital Menu" />
        <meta
          property="og:description"
          content="Rateup - Experience quick, delicious dining with our digital menus."
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
      <SimplicityRefined />
      <RateupInAction />
      <HowItWorks />
    </>
  );
}

export default Menus;
