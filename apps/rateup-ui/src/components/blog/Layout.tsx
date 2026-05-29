import ScrollToTop from "../RateupHomePage/helpers/ScrollToTop.tsx";
import Layout from "../RateupHomePage/Layout.tsx";
import StickySidebar from "./StickySidebar.tsx";

type LayoutProps = {
  readonly children: React.ReactNode;
  readonly title?: string;
  readonly description?: string;
};

export default function BlogLayout({ children }: Readonly<LayoutProps>) {
  // Note: Metadata should be set via route loader or route-specific head configuration
  // For TanStack Start, use route.ts head() or pass to createFileRoute()
  return (
    <Layout isBlog={true}>
      <div className="mx-auto max-w-7xl px-4 mt-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3">{children}</div>
          {/* Sidebar - 1 column */}
          <div className="hidden lg:block">
            <div className="sticky top-26 h-fit">
              <StickySidebar />
            </div>
          </div>
        </div>
      </div>
      <ScrollToTop />
    </Layout>
  );
}
