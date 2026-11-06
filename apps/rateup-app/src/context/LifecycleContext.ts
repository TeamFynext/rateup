import { createContext, useContext } from "react";

type LifecycleLabel = {
  id: string;
  name: string;
  emoji: string;
};

export const LifecycleContext = createContext<LifecycleLabel[] | null>(null);

export const useLifecycleContext = (): LifecycleLabel[] => {
  const context = useContext(LifecycleContext);

  if (!context) {
    throw new Error("useLifecycleContext must be used within a LifecycleContext.Provider");
  }

  return context;
};
