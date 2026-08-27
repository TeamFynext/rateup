import { axiosClient } from "../apiClient";

const BASE_URL = "/maintenance";

/** A migration the admin panel can run, as the catalog endpoint describes it. */
export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  /** Applying is hard to walk back; the panel asks the operator to confirm. */
  destructive: boolean;
}

export interface MaintenanceTaskResult {
  applied: boolean;
  summary: string;
  /** The task's transcript, in the order it happened. */
  lines: string[];
  details?: Record<string, unknown>;
}

export async function getMaintenanceTasks() {
  return (await axiosClient.get(`${BASE_URL}/tasks`)).data as MaintenanceTask[];
}

export async function runMaintenanceTask({ taskId, apply }: { taskId: string; apply: boolean }) {
  // Long migrations outlive the client's 8s default; the server is the only sensible
  // place to bound them.
  const res = await axiosClient.post(`${BASE_URL}/tasks/${taskId}/run`, { apply }, { timeout: 0 });
  return res.data as MaintenanceTaskResult;
}
