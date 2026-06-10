import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";

import { Button } from "@/components/ui/button.tsx";
import { imagesPath } from "@/utils/constants.ts";

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
  const logoUrl = `${imagesPath}/rateup-logo-horizontal-transparent.png`;

  const ButtonContent = () => (
    <span className="text-xs">{isSignup ? "Sign In" : "Create account"}</span>
  );

  return (
    <header className="w-full bg-[#081C3F] border-b border-white/5 shadow-md">
      <div
        className={`mx-auto w-full px-6 py-[18px] flex items-center justify-between gap-4 ${maxWidth}`}
      >
        <Link to="/" className="flex items-center shrink-0">
          <Image
            src={logoUrl}
            alt="RateUp Logo"
            width={100}
            height={33}
            className="h-8 w-auto object-contain rounded-md"
          />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px] text-white/65 font-medium leading-none">
            {isSignup ? "Already have an account?" : "Don't have an account?"}
          </span>
          {onSwitch ? (
            <Button
              variant="outline"
              onClick={onSwitch}
              className="h-[30px] px-4 bg-transparent text-white"
            >
              <ButtonContent />
            </Button>
          ) : (
            <Link to={isSignup ? "/login" : "/signup"}>
              <Button
                variant="outline"
                className="h-[30px] px-4 bg-transparent text-white"
              >
                <ButtonContent />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
