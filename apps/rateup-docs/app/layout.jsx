import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import Image from "next/image";
 
export const metadata = {
  
}

const navbar = (
  <Navbar
    logo={
      <>
        <Image
          src={"/images/rateup-logo.svg"}
          width={50}
          height={50}
          alt="rateup logo"
        />
        <span>Rate Up Documentation</span>
      </>
    }
    projectIcon={<Image src={"/images/rateup-star.svg"} width={30} height={30} alt="rateup logo"/>}
    projectLink="https://rateup.app"
  />
);
const footer = (
  <Footer>
    <footer
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        width: "100%",
      }}
    >
      <p>
        Powered by{" "}
        <Image
          src={"/images/rateup-logo.svg"}
          width={50}
          height={50}
          alt="rateup logo"
        />
      </p>
      <p style={{ marginLeft: "auto" }}>
        Copyright © {new Date().getFullYear()} RateUp Docs, Inc.
      </p>
    </footer>
  </Footer>
);

export default async function RootLayout({ children }) {
  return (
    <html>
      <Head>
        {
          <>
            <title>RateUp Documentation</title>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <meta property="og:title" content="RateUp Documentation" />
            <meta
              property="og:description"
              content="Welcome to the RateUp documentation"
            />
            <link rel="icon" href="/favicon.png" />
          </>
        }
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          footer={footer}
          feedback={{ link: "https://rateup.app", content: "Feedback" }}
          editLink={false}
          copyPageButton={false}
          
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
