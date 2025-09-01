import { Metadata } from "next";

import { z } from "zod";

import { columns } from "@/components/1-table/columns";
import { DataTableToolbar } from "@/components/1-table/data-table-toolbar";
import { taskSchema } from "@/components/1-table/data/schema";
import { taskData } from "@/components/1-table/data/task";
import { DataTable } from "@/components/Table/data-table";

export const metadata: Metadata = {
  title: "Tasks",
  description: "A task and issue tracker build using Tanstack Table.",
};

// Simulate a database read for tasks.
function getTasks() {
  return z.array(taskSchema).parse(taskData);
}

export default function TaskPage() {
  const tasks = getTasks();

  return (
    <div>
      <DataTable
        data={tasks}
        columns={columns}
        DataTableToolbar={DataTableToolbar}
      />
    </div>
  );
}
