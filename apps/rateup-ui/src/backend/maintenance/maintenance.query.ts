import { useMutation, useQuery } from "@tanstack/react-query";

import { getMaintenanceTasks, runMaintenanceTask } from "./maintenance.api";

export function useMaintenanceTasks() {
  return useQuery({
    queryKey: ["maintenanceTasks"],
    queryFn: getMaintenanceTasks,
  });
}

/**
 * Runs one task. Deliberately not invalidating any query: a migration can touch anything,
 * and quietly refetching half the app while the operator is reading a transcript hides
 * what changed. They reload when they are ready.
 */
export function useRunMaintenanceTask() {
  return useMutation({ mutationFn: runMaintenanceTask });
}
