"use client";

import React from "react";

import { createFileRoute } from "@tanstack/react-router";

import { DataTable } from "@/components/Table/data-table.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";

import { columns } from "../../../../components/dashboard/contacts/components/columns.tsx";
import { DataTableToolbar } from "../../../../components/dashboard/contacts/custom-fields/data-table-toolbar.tsx";

export const Route = createFileRoute("/dashboard/contacts/custom-fields/")({
  component: CustomFields,
});

function CustomFields() {
  return <CustomFieldsSettings />;
}

function CustomFieldsSettings() {
  const { customFields } = useCustomFieldsContext();
  return (
    <DataTable
      data={customFields}
      columns={columns}
      DataTableToolbar={DataTableToolbar}
    />
  );
}
