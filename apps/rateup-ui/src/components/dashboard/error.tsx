"use client";

import CommonError from "@/components/404/common-error.tsx";

import MainSidebar from "../Layout/Navbar/main-sidebar";

const DashboardError = (props) => {
  return (
    <MainSidebar>
      <CommonError {...props} className="h-screen" />
    </MainSidebar>
  );
};

export default DashboardError;
