import NotFoundPage from "@/components/404/NotFound.tsx";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";

const Error = () => {
  return (
    <Layout>
      <NotFoundPage />
      <HomePageFooter />
    </Layout>
  );
};

export default Error;
