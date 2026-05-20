import ScrollToTop from "../RateupHomePage/helpers/ScrollToTop.tsx";
import Layout from "../RateupHomePage/Layout.tsx";

type LayoutProps = {
  readonly children: React.ReactNode;
  readonly title?: string;
  readonly description?: string;
};

export default function BlogLayout({ children, title, description }: Readonly<LayoutProps>) {
  // Note: Metadata should be set via route loader or route-specific head configuration
  // For TanStack Start, use route.ts head() or pass to createFileRoute()
  return (
    <Layout isBlog={true}>
      {children}
      {/* <HomePageFooter /> */}
      <ScrollToTop />
    </Layout>
  );
}
