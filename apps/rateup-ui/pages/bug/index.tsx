import React from "react";

import { Button } from "@mantine/core";

const index = () => {
  return (
    <div>
      <Button
        onClick={() => {
          throw new Error("error from build");
        }}
      >
        throw error
      </Button>
    </div>
  );
};

export default index;
