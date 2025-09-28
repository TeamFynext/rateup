"use client";

import React from "react";

import { DataTable } from "@/components/Table/data-table";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";

import { columns } from "../components/columns";
import { DataTableToolbar } from "../components/data-table-toolbar";

const CustomFields = () => {
  return <CustomFieldsSettings />;
};

export const CustomFieldsSettings = () => {
  const { customFields } = useCustomFieldsContext();
  return (
    <DataTable
      data={customFields || []}
      columns={columns}
      DataTableToolbar={DataTableToolbar}
    />
  );
};

export default CustomFields;
