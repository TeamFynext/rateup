import React from "react";

import RateupLoader from "@/components/Loaders/RateupLoader";

const loading = () => {
  return (
    <div className="h-screen">
      <RateupLoader />
    </div>
  );
};

export default loading;
