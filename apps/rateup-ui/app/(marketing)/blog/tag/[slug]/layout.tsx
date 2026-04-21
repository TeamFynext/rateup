import React, { ReactNode } from "react";
import { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata["/blog/tag"];

function BlogTagLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div>{children}</div>;
}

export default BlogTagLayout;
