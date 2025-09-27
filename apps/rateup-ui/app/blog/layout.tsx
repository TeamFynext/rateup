import React, { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";

export const metadata = pageMetadata["/blog"];

function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      {children}
      <HomePageFooter />
    </div>
  );
}

export default BlogLayout;
