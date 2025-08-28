import React from "react";

import { AdminPanelLayout } from "@/components/Layout/admin/AdminLayout";

const AdminLayout = ({ children }) => {
  return <AdminPanelLayout>{children}</AdminPanelLayout>;
};

export default AdminLayout;
