import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useRegisterBusinessClientMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

const fbLogin = (
  configId: string | null = null,
): Promise<{
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: {
    accessToken: string;
    expiresIn: string;
    signedRequest: string;
    userID: string;
    code: string;
  };
}> => {
  return new Promise((resolve) => {
    globalThis.FB.login((response) => resolve(response), {
      config_id: configId ?? import.meta.env.VITE_META_CONFIG_ID,
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: "whatsapp_business_app_onboarding",
        sessionInfoVersion: "4",
      },
    });
  });
};

export function MetaLoginButton({
  disabled = false,
  configId = null,
  selectedAssets,
}: Readonly<{
  disabled?: boolean;
  configId?: string | null;
  selectedAssets: string[];
}>) {
  const [waData, setWaData] = useState({ phone_number_id: "", waba_id: "" });
  const [code, setCode] = useState("");
  const submittedCodeRef = useRef("");
  const registerMutation = useRegisterBusinessClientMutation(() => {
    setWaData({ phone_number_id: "", waba_id: "" });
    setCode("");
  });
  const { t: translations } = useTranslation();
  const { mutate: registerBusinessClient } = registerMutation;

  useEffect(() => {
    if (waData.waba_id && code && submittedCodeRef.current !== code) {
      submittedCodeRef.current = code;
      registerBusinessClient({
        code,
        phone_number_id: waData.phone_number_id,
        waba_id: waData.waba_id,
        assets: selectedAssets,
      });
    }
  }, [code, registerBusinessClient, selectedAssets, waData]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith("facebook.com")) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (["FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", "FINISH"].includes(data.event)) {
            setWaData({
              phone_number_id: data.data?.phone_number_id ?? "",
              waba_id: data?.data?.waba_id,
            });
          } else if (data.event === "CANCEL") {
            setWaData({ phone_number_id: "", waba_id: "" });
            setCode("");
            toast.warning(`Meta login cancelled at ${data.data?.current_step}`, {
              id: "meta-login-status",
            });
          } else if (data.event === "ERROR") {
            setWaData({ phone_number_id: "", waba_id: "" });
            setCode("");
            toast.error(JSON.stringify(data.data?.error_message), { id: "meta-login-status" });
          }
        }
      } catch {
        // Ignore unsupported message payloads
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function login() {
    const response = await fbLogin(configId);
    if (response.authResponse?.code) {
      setCode(response.authResponse.code);
      return;
    }

    if (response.status === "not_authorized") {
      toast.error("Not authorized", { id: "meta-login-status" });
      return;
    }

    toast.error("Error in meta login, Try again later", { id: "meta-login-status" });
  }

  return (
    <Button
      onClick={login}
      style={{
        backgroundColor: "#1877f2",
        border: 0,
        borderRadius: "4px",
        color: "#fff",
        cursor: "pointer",
        fontFamily: "Helvetica, Arial, sans-serif",
        fontSize: "16px",
        fontWeight: "bold",
        height: "40px",
        padding: "0 24px",
      }}
      disabled={disabled || registerMutation.isPending}
    >
      {registerMutation.isPending && <Spinner />}
      {translations("Login with Facebook")}
    </Button>
  );
}
