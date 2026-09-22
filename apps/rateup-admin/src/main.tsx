import "./styles/app.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import { queryClient, router } from "./router";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element missing from index.html");

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
