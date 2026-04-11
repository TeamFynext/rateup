import React, { ReactNode } from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata["/blog/tag"];

function BlogTagLayout({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export default BlogTagLayout;
