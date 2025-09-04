"use client";

import React from "react";

import { DataTable } from "@/components/Table/data-table";
import { useLabelsContext } from "@/context/LabelsContext";

import { columns } from "./components/columns";
import { DataTableToolbar } from "./components/data-table-toolbar";
import { EditLabelsProvider } from "./components/edit-label-context";
import EditLabelModal from "./components/edit-label-modal";

const ContactSettings = () => {
  const labels = useLabelsContext();
  return (
    <EditLabelsProvider>
      <DataTable
        data={labels || []}
        columns={columns}
        DataTableToolbar={DataTableToolbar}
      />
      <EditLabelModal />
    </EditLabelsProvider>
  );
};
export default ContactSettings;
