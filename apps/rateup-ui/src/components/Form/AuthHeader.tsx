import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";

import { Button, buttonVariants } from "@/components/ui/button.tsx";
import { rateupLogoWhite } from "@/utils/constants.ts";

interface AuthHeaderProps {
  isSignup: boolean;
  onSwitch?: () => void;
  maxWidth?: string;
}

export function AuthHeader({
  isSignup,
  onSwitch,
  maxWidth = "max-w-sm",
}: Readonly<AuthHeaderProps>) {
  const switchLabel = isSignup ? "Sign In" : "Create account";

  return (
    <header className="w-full bg-ru-blue-900 border-b border-white/5 shadow-md">
      <div
        className={`mx-auto flex h-12 w-full items-center justify-between gap-4 px-5 ${maxWidth}`}
      >
        <Link to="/" className="flex items-center shrink-0">
          <Image
            src={rateupLogoWhite}
            alt="RateUp Logo"
            width={100}
            height={33}
            className="h-10 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[13.5px] text-white/60 leading-none">
            {isSignup ? "Already have an account?" : "Don't have an account?"}
          </span>
          {onSwitch ? (
            <Button
              type="button"
              variant="outline"
              onClick={onSwitch}
              className="h-8 px-3.5 rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/15"
            >
              <span className="text-[13.5px] font-semibold">{switchLabel}</span>
            </Button>
          ) : (
            <Link
              to={isSignup ? "/login" : "/signup"}
              aria-label={switchLabel}
              className={buttonVariants({
                variant: "outline",
                className:
                  "h-8 px-3.5 rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white",
              })}
            >
              <span className="text-[13.5px] font-semibold">{switchLabel}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
