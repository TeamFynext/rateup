import CommonError from "@/components/404/common-error.tsx";

import MainSidebar from "../Layout/Navbar/main-sidebar";

const DashboardError = (props: { error?: Error; reset?: () => void }) => {
  return (
    <MainSidebar>
      {/* Inside the app shell, "back" means the dashboard — the marketing homepage would
          drop a signed-in customer out of the product. */}
      <CommonError {...props} className="h-screen" homeTo="/dashboard" />
    </MainSidebar>
  );
};

export default DashboardError;
