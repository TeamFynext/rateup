import Head from "next/head";

import ScrollToTop from "../RateupHomePage/helpers/ScrollToTop";
import Layout from "../RateupHomePage/Layout";

type LayoutProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

export default function BlogLayout({
  children,
  title = "RateUp Blog",
  description = "The latest insights on business reviews and customer feedback",
}: Readonly<LayoutProps>) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout isBlog={true}>
        {children}
        {/* <HomePageFooter /> */}
        <ScrollToTop />
      </Layout>
    </>
  );
}
