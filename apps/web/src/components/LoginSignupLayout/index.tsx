import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import type { ReactNode } from "react";

import { useResolvedTheme } from "@/components/theme/theme-provider.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";

import { rateupLogoUrl } from "../HomePage/constants.tsx";

import styles from "./login-signup-layout.module.css";

function LoginSignupLayout({ children }: { children: ReactNode }) {
  const colorScheme = useResolvedTheme();

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center w-full sm:w-full lg:w-[70%] py-6 gap-[50px]">
        <Link to="/">
          <Image src={rateupLogoUrl} alt="RateUp Logo" width={214} height={85} />
        </Link>
        <div
          className={`${styles[`color-scheme-${colorScheme}`]} rounded-xl p-8 w-[90%] sm:w-[90%] xl:w-[70%] 2xl:w-[50%]`}
        >
          <ScrollArea className={`${styles["scroll-area-div"]} h-full w-full`}>
            {children}
          </ScrollArea>
        </div>
      </div>
      {/* <LoginSignupDecorativeImage /> */}
    </div>
  );
}

export default LoginSignupLayout;
