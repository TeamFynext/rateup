import React, { ReactNode } from "react";

import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";

function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      {children}
      <HomePageFooter />
    </div>
  );
}

export default BlogLayout;
