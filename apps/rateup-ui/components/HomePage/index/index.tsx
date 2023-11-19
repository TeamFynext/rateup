import LandingPageLayout from "../LandingPageLayout";
import Home from "../pages/Home";
import { useRouter } from "next/router";
import Reputation from "../pages/Reputation";

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
  }

  return <LandingPageLayout>{componentToBeRendered}</LandingPageLayout>;
}

export default HomePage;
