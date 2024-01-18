import { useQuery } from "@tanstack/react-query";
import { getPricing } from "./pricing.api";

export const usePricing = () =>
  useQuery({
    queryKey: ["pricing"],
    queryFn: getPricing,
  });
