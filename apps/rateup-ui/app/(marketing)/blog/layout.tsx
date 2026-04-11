import React, { ReactNode } from "react";
import { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";

export const metadata: Metadata = pageMetadata["/blog"];

function BlogLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div>
      {children}
      <HomePageFooter />
    </div>
  );
}

export default BlogLayout;
