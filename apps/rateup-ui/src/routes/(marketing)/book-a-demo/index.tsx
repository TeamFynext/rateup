import { createFileRoute } from "@tanstack/react-router";

import Layout from "@/components/RateupHomePage/Layout.tsx";
import BookDemoPage from "@/components/RateupHomePage/pages/BookDemoPage.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/book-a-demo/")({
  component: BookDemo,
  head: () => buildPageHead("/book-a-demo"),
});

function BookDemo() {
  return (
    <Layout>
      <BookDemoPage />
    </Layout>
  );
}
