import Head from "next/head";
import { MantineProvider } from "@mantine/core";
import ContentPage from "./content";

export default function Blog() {
  return (
    <MantineProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>RATEUP Blog</title>
      </Head>
      <div>
        <ContentPage />
      </div>
    </MantineProvider>
  );
}
