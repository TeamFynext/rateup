import LandingPageLayout from "../LandingPageLayout";
import Home from "../pages/Home";
import { useRouter } from "next/router";
import Reputation from "../pages/Reputation";
import Menus from "../pages/Menus";

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
  }

  return <LandingPageLayout>{componentToBeRendered}</LandingPageLayout>;
}

export default HomePage;
