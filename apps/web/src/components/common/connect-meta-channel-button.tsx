// Connects Messenger Pages or Instagram accounts, each through its own Facebook Login for
// Business config. The two never share a login, so enrolling in one asks only for that
// platform's permissions, and neither needs a WhatsApp number. Every picked Page or
// account becomes its own channel; an org can connect as many as it likes.

import { IconBrandFacebook, IconBrandInstagram } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  GrantedMetaAccount,
  MetaChannelLogin,
  MetaChannelPlatform,
} from "@/backend/meta/metaChannels.api";
import {
  useConnectMetaChannelsMutation,
  useMetaChannelLoginMutation,
} from "@/backend/meta/metaChannels.query";
import type { FacebookBrandButtonProps } from "@/components/common/facebook-brand-button.tsx";
import { FacebookBrandButton } from "@/components/common/facebook-brand-button.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { loadFacebookSdk } from "@/lib/facebook-sdk";
import { cn } from "@/lib/utils";

/** The settings route's names for the two platforms. */
export type MetaChannelRoute = "facebook" | "instagram";

const PLATFORM: Record<MetaChannelRoute, MetaChannelPlatform> = {
  facebook: "FACEBOOK",
  instagram: "INSTAGRAM",
};

/** One login config per platform, so each asks only for its own permissions. */
const CONFIG_ID: Record<MetaChannelRoute, string | undefined> = {
  facebook: import.meta.env.VITE_META_FACEBOOK_CONFIG_ID,
  instagram: import.meta.env.VITE_META_INSTAGRAM_CONFIG_ID,
};

function fbLogin(configId: string): Promise<FacebookLoginResponse> {
  return new Promise((resolve, reject) => {
    if (!globalThis.FB) {
      reject(new Error("Facebook SDK is not loaded"));
      return;
    }
    // Plain Facebook Login for Business: no Embedded Signup extras, so Meta shows the
    // config's own asset picker rather than the WhatsApp onboarding flow.
    globalThis.FB.login((response) => resolve(response), {
      config_id: configId,
      response_type: "code",
      override_default_response_type: true,
    });
  });
}

export function ConnectMetaChannelButton({
  platform,
  label,
  className,
  size,
}: Readonly<{
  platform: MetaChannelRoute;
  label?: string;
  className?: string;
  size?: FacebookBrandButtonProps["size"];
}>) {
  const { t: translations } = useTranslation();
  const loginMutation = useMetaChannelLoginMutation();
  const [login, setLogin] = useState<MetaChannelLogin | null>(null);

  useEffect(() => {
    void loadFacebookSdk().catch(() => {
      // Reported when the button is clicked.
    });
  }, []);

  const start = async () => {
    const configId = CONFIG_ID[platform];
    if (!configId) {
      toast.error(translations("This channel is not set up yet. Contact support."), {
        id: "meta-channel-login",
      });
      return;
    }
    let response: FacebookLoginResponse;
    try {
      response = await fbLogin(configId);
    } catch {
      toast.error(translations("Facebook could not be loaded. Refresh and try again."), {
        id: "meta-channel-login",
      });
      return;
    }
    const code = response.authResponse?.code;
    if (!code) {
      if (response.status === "not_authorized") {
        toast.error(translations("Not authorized"), { id: "meta-channel-login" });
      }
      // Closing the popup lands here too; that is a cancel, not an error.
      return;
    }
    loginMutation.mutate({ platform: PLATFORM[platform], code }, { onSuccess: setLogin });
  };

  return (
    <>
      <FacebookBrandButton
        className={className}
        size={size}
        onClick={start}
        disabled={loginMutation.isPending}
        adornment={loginMutation.isPending ? <Spinner /> : null}
        label={label ?? translations("Continue with Facebook")}
      />
      {login && <MetaAccountPicker login={login} close={() => setLogin(null)} />}
    </>
  );
}

function MetaAccountPicker({
  login,
  close,
}: Readonly<{
  login: MetaChannelLogin;
  close: () => void;
}>) {
  const { t: translations } = useTranslation();
  const connectMutation = useConnectMetaChannelsMutation();
  const instagram = login.platform === "INSTAGRAM";
  const Icon = instagram ? IconBrandInstagram : IconBrandFacebook;

  // Pickable accounts start ticked: they were just chosen in Meta's own dialog.
  const [picked, setPicked] = useState<Set<string>>(
    () =>
      new Set(
        login.accounts
          .filter((account) => !account.connectedElsewhere && !account.connectedChannelId)
          .map((account) => account.accountId),
      ),
  );

  const toggle = (account: GrantedMetaAccount) => {
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(account.accountId)) next.delete(account.accountId);
      else next.add(account.accountId);
      return next;
    });
  };

  const connect = () => {
    connectMutation.mutate(
      { platform: login.platform, loginId: login.loginId, accountIds: Array.from(picked) },
      {
        onSuccess: ({ results }) => {
          const connected = results.filter((result) => result.channel).length;
          for (const result of results) {
            if (result.error) toast.error(result.error);
          }
          if (connected > 0) {
            toast.success(translations("{count} connected", { count: connected }));
            close();
          }
        },
      },
    );
  };

  const title = (account: GrantedMetaAccount) =>
    instagram
      ? account.username
        ? `@${account.username}`
        : (account.name ?? account.accountId)
      : (account.name ?? account.accountId);

  const subtitle = (account: GrantedMetaAccount) => {
    if (account.connectedElsewhere) return translations("Connected to another organization");
    if (account.connectedChannelId) return translations("Already connected — reconnects it");
    if (instagram && account.pageName) {
      return translations("Linked to {page}", { page: account.pageName });
    }
    return undefined;
  };

  return (
    <Dialog open onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {instagram
              ? translations("Choose Instagram accounts")
              : translations("Choose Facebook Pages")}
          </DialogTitle>
          <DialogDescription>
            {instagram
              ? translations("Each account becomes its own Instagram channel.")
              : translations("Each Page becomes its own Messenger channel.")}
          </DialogDescription>
        </DialogHeader>

        {login.accounts.length ? (
          <div className="max-h-80 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain">
            {login.accounts.map((account) => {
              const disabled = account.connectedElsewhere;
              const name = title(account);
              const hint = subtitle(account);
              return (
                <label
                  key={account.accountId}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2",
                    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted",
                  )}
                >
                  <Avatar aria-hidden className="size-10 rounded-md after:rounded-md">
                    <AvatarImage src={account.pictureUrl} alt="" className="rounded-md" />
                    <AvatarFallback className="rounded-md text-base font-semibold">
                      <Icon className="size-5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base">{name}</span>
                    {hint && (
                      <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                    )}
                  </span>
                  <Checkbox
                    className="size-5"
                    checked={!disabled && picked.has(account.accountId)}
                    disabled={disabled}
                    onCheckedChange={() => toggle(account)}
                  />
                </label>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg bg-muted px-4 py-6 text-center text-muted-foreground">
            {instagram
              ? translations(
                  "No Instagram professional accounts were shared. Log in again and choose the Facebook Page each account is linked to.",
                )
              : translations(
                  "No Facebook Pages were shared. Log in again and choose at least one.",
                )}
          </p>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="secondary" size="lg" onClick={close}>
            {translations("Cancel")}
          </Button>
          <Button
            size="lg"
            onClick={connect}
            loading={connectMutation.isPending}
            disabled={picked.size === 0}
          >
            {picked.size > 1
              ? translations("Connect {count}", { count: picked.size })
              : translations("Connect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
