import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CreateRule } from "../../../types/rule";
import {
  createRule,
  deleteRule,
  getAllRules,
  getRuleById,
  updateRule,
} from "./rule.api";

export const useRules = () =>
  useQuery({
    queryKey: ["rules"],
    queryFn: getAllRules,
  });

export const useRuleById = (id: string) =>
  useQuery({
    queryKey: ["rule", { id }],
    queryFn: () => getRuleById(id),
    enabled: !!id,
  });

export const useCreateRuleMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRule) => createRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules"] });
      toast.success("Rule Created Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error Creating Rule");
    },
  });
};

export const useUpdateRuleMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateRule> & { id: string }) =>
      updateRule(id, data),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["rules"] });
      qc.invalidateQueries({ queryKey: ["rule", { id: variables.id }] });
      toast.success("Rule Updated Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error Updating Rule");
    },
  });
};

export const useDeleteRuleMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rules"] });
      toast.success("Rule Deleted Successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error Deleting Rule");
    },
  });
};
