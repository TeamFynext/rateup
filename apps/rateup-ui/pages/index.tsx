import LandingPageLayout from "../components/HomePage/LandingPageLayout";
import HomePage from "../components/HomePage/pages/Home";
import landingPageLayoutStyles from "../components/HomePage/LandingPageLayout/LandingPageLayout.module.css";

export default function Home() {
  return (
    <LandingPageLayout
      className={`${landingPageLayoutStyles["home-page-root"]}`}
    >
      <HomePage />
    </LandingPageLayout>
  );
}
