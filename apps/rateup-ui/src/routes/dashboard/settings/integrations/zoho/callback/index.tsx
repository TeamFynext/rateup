"use client";

import { useEffect } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { connectZoho } from "@/backend/appsIntegration/integration.api";
import { RateupStar, ZohoLogo } from "@/components/integrations/logos";

export const Route = createFileRoute(
  "/dashboard/settings/integrations/zoho/callback/",
)({
  component: ZohoCallback,
});

function ZohoCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    async function connect() {
      try {
        const params = new URLSearchParams(window.location.search);

        const code = params.get("code");
        const orgId = params.get("state");

        if (!code || !orgId) {
          navigate({ to: "/dashboard/settings/integrations" });
          return;
        }

        await connectZoho(code, orgId);
        toast.success(t("Successfully connected to Zoho."));
        navigate({ to: "/dashboard/settings/integrations/zoho" });
      } catch (error) {
        toast.error(t("Could not connect zoho."));
        navigate({ to: "/dashboard/settings/integrations/zoho" });
      }
    }

    connect();
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-xl shadow-2xl p-10">
        <div className="flex flex-col items-center justify-center gap-10">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-slate-800"
          >
            {t("Connecting Zoho CRM")}
          </motion.h1>

          <div className="relative flex items-center justify-center w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="z-10 rounded-3xl bg-white shadow-lg border border-slate-200 p-6"
            >
              <RateupStar className="h-20 w-20" />
            </motion.div>

            <div className="absolute flex items-center justify-center w-full px-40">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                  }}
                  className="absolute top-0 h-full w-1/3 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-red-500"
                />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="z-10 rounded-3xl bg-white shadow-lg border border-slate-200 p-6"
            >
              <ZohoLogo className="h-20 w-20" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <p className="text-lg font-medium text-slate-700">
              {t("Establishing secure OAuth connection")}...
            </p>

            <p className="text-sm text-slate-500 text-center max-w-md">
              {t(
                "Please wait while we securely connect your Zoho CRM account with Rateup",
              )}
              .
            </p>
          </motion.div>

          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="h-3 w-3 rounded-full bg-blue-500"
            />

            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
              className="h-3 w-3 rounded-full bg-violet-500"
            />

            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
              className="h-3 w-3 rounded-full bg-red-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
