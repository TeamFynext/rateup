import LandingPageLayout from "../LandingPageLayout";
import Home from "../pages/Home";
import { useRouter } from "next/router";
import Reputation from "../pages/Reputation";
import Menus from "../pages/Menus";
import TermsOfService from "../pages/TermsOfService";
import PrivacyPolicy from "../pages/PrivacyPolicy";

function HomePage() {
  const { pathname } = useRouter();
  let componentToBeRendered: React.ReactNode;

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
    }
  }

  return <LandingPageLayout>{componentToBeRendered}</LandingPageLayout>;
}

export default HomePage;
