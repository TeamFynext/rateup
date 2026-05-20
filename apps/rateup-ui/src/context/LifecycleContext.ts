"use client";

import { createContext, use } from "react";

export const LifecycleContext = createContext(undefined);

export const useLifecycleContext = () => use(LifecycleContext);
