"use client";

import { createContext, use } from "react";

export const LabelsContext = createContext(undefined);

export const useLabelsContext = () => use(LabelsContext);
