import { createContext, use } from "react";

import type { GetLabelsRes } from "@/backend/lifecycle/lifecycle.types";

/** The org's lifecycle stages; `undefined` until the provider loads them. */
export const LifecycleContext = createContext<GetLabelsRes[] | undefined>(undefined);

export const useLifecycleContext = () => use(LifecycleContext);
