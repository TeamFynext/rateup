import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import Image from "next/image";
import "nextra-theme-docs/style.css";

export const metadata = {
  title: {
    default: "RateUp Documentation",
    template: "RateUp Documentation", // will allow page-specific titles
  },
  description: "Welcome to the RateUp documentation",
  openGraph: {
    title: "RateUp Documentation",
    description: "Welcome to the RateUp documentation",
  },
  icons: {
    icon: "/favicon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

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
    projectIcon={
      <Image
        src={"/images/rateup-star.svg"}
        width={30}
        height={30}
        alt="rateup logo"
      />
    }
    projectLink="https://rateup.app"
  />
);
const footer = (
  <Footer className="flex">
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
  </Footer>
);

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head></Head>
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
