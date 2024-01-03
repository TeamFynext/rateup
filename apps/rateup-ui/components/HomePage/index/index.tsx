import LandingPageLayout from "../LandingPageLayout";
import Home from "../pages/Home";
import { useRouter } from "next/router";
import Reputation from "../pages/Reputation";
import Menus from "../pages/Menus";
import TermsOfService from "../pages/TermsOfService";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import ContactUs from "../pages/ContactUs";
import AboutUs from "../pages/AboutUs";

function HomePage() {
  const { pathname } = useRouter();
  let componentToBeRendered: React.ReactNode;

  let lanadingPageLayoutClassName = "";

  switch (pathname) {
    case "/": {
      componentToBeRendered = <Home />;
      break;
    }
    case "/reputation": {
      componentToBeRendered = <Reputation />;
      break;
    }
    case "/menus": {
      componentToBeRendered = <Menus />;
      break;
    }
    case "/terms-of-service": {
      componentToBeRendered = <TermsOfService />;
      break;
    }
    case "/privacy-policy": {
      componentToBeRendered = <PrivacyPolicy />;
      break;
    }
    case "/contact-us": {
      componentToBeRendered = <ContactUs />;
      break;
    }
    case "/about-us": {
      lanadingPageLayoutClassName = "about-us-landing-page-layout";
      componentToBeRendered = <AboutUs />;
      break;
    }
  }

  return (
    <LandingPageLayout className={lanadingPageLayoutClassName}>
      {componentToBeRendered}
    </LandingPageLayout>
  );
}

export default HomePage;
